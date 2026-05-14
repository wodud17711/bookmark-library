package com.google.bookmark.service;

import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.BookshelfZone;
import com.google.bookmark.domain.Library;
import com.google.bookmark.domain.StoredBook;
import com.google.bookmark.domain.User;
import com.google.bookmark.dto.ImportEntry;
import com.google.bookmark.dto.ImportOutcome;
import com.google.bookmark.dto.ImportRequest;
import com.google.bookmark.dto.ImportSummary;
import com.google.bookmark.repository.BookRepository;
import com.google.bookmark.repository.LibraryRepository;
import com.google.bookmark.repository.StoredBookRepository;
import com.google.bookmark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class BookmarkImportService {

    private static final int MAX_BOOKS_PER_SHELF = 30;
    /**
     * Hard cap on how many freshly-imported books receive AI annotation in
     * the background. Larger imports keep their import-time titles on the
     * tail end. Sized to leave headroom in Gemini's daily 500-RPD budget for
     * interactive add-book calls — see AsyncConfig comment for the math.
     * Storage mode skips annotation entirely.
     */
    private static final int AI_ANNOTATION_CAP = 50;

    private final UserRepository userRepository;
    private final LibraryRepository libraryRepository;
    private final StoredBookRepository storedBookRepository;
    private final BookRepository bookRepository;

    public ImportOutcome importBookmarks(Long userId, ImportRequest request) {
        return switch (request.mode()) {
            case "STORAGE" -> ImportOutcome.of(importToStorage(userId, request.entries()));
            case "SHELVES" -> importToShelves(userId, request.libraryId(), request.entries());
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown mode: " + request.mode());
        };
    }

    private ImportSummary importToStorage(Long userId, List<ImportEntry> entries) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        for (ImportEntry e : entries) {
            StoredBook sb = new StoredBook();
            sb.setUser(user);
            sb.setUrl(e.url());
            sb.setTitle(e.title());
            sb.setSiteName(e.siteName());
            sb.setOriginalFolder(e.folderPath());
            storedBookRepository.save(sb);
        }

        return new ImportSummary("STORAGE", 0, 0, entries.size(), List.of());
    }

    private ImportOutcome importToShelves(Long userId, Long libraryId, List<ImportEntry> entries) {
        Library library = resolveTargetLibrary(userId, libraryId);
        User user = library.getUser();

        // Step 1: assign one shelf name per unique folder path (in order of first appearance).
        Map<String, String> pathToShelfName = new LinkedHashMap<>();
        Set<String> usedNames = new HashSet<>();
        for (ImportEntry e : entries) {
            String path = e.folderPath() == null ? "" : e.folderPath();
            if (pathToShelfName.containsKey(path)) continue;
            String name = pickShelfName(path, usedNames);
            pathToShelfName.put(path, name);
            usedNames.add(name);
        }

        // Step 2: group entries by their resolved shelf name (preserves first-seen order).
        Map<String, List<ImportEntry>> groups = new LinkedHashMap<>();
        for (ImportEntry e : entries) {
            String key = e.folderPath() == null ? "" : e.folderPath();
            String name = pathToShelfName.get(key);
            groups.computeIfAbsent(name, k -> new ArrayList<>()).add(e);
        }

        int basePosition = library.getBookshelves().stream()
            .filter(s -> s.getZone() == BookshelfZone.PUBLIC)
            .mapToInt(Bookshelf::getPosition)
            .max()
            .orElse(-1) + 1;
        int remainingShelfSlots = Library.MAX_BOOKSHELVES - library.getBookshelves().size();

        int shelvesCreated = 0;
        int booksImported = 0;
        int storedCount = 0;
        List<String> warnings = new ArrayList<>();
        // First N freshly-imported Book entities — picked up after flush()
        // so they have generated IDs. Background AI annotation processes
        // these in order; the rest keep their import-time Chrome titles.
        List<Book> annotateCandidates = new ArrayList<>();

        // Iterate groups in first-seen order. For each, plan how many shelves it would consume
        // (1 + chunks of 30). If it fits in remaining slots, create them. Otherwise, route the
        // group's books to storage and warn the user.
        for (Map.Entry<String, List<ImportEntry>> group : groups.entrySet()) {
            String name = group.getKey();
            List<ImportEntry> books = group.getValue();
            int chunks = (int) Math.ceil((double) books.size() / MAX_BOOKS_PER_SHELF);

            if (chunks > remainingShelfSlots) {
                // Doesn't fit — send this folder's books to storage instead.
                for (ImportEntry e : books) {
                    StoredBook sb = new StoredBook();
                    sb.setUser(user);
                    sb.setUrl(e.url());
                    sb.setTitle(e.title());
                    sb.setSiteName(e.siteName());
                    sb.setOriginalFolder(e.folderPath());
                    storedBookRepository.save(sb);
                    storedCount++;
                }
                warnings.add(String.format(
                    "'%s' 폴더는 책장 한도(도서관당 %d개)를 넘어서 %d권이 창고로 보관됐습니다.",
                    name, Library.MAX_BOOKSHELVES, books.size()
                ));
                continue;
            }

            // Fits — create chunked shelves
            int chunkIndex = 1;
            for (int i = 0; i < books.size(); i += MAX_BOOKS_PER_SHELF) {
                List<ImportEntry> chunk = books.subList(i, Math.min(i + MAX_BOOKS_PER_SHELF, books.size()));
                String shelfTitle = chunks > 1 ? name + " (" + chunkIndex + ")" : name;

                Bookshelf shelf = new Bookshelf();
                shelf.setTitle(shelfTitle);
                shelf.setZone(BookshelfZone.PUBLIC);
                shelf.setPosition(basePosition + shelvesCreated);
                library.addBookshelf(shelf);

                // Bypasses BookService.create on purpose — running AI tagging
                // synchronously for a 100+ book Chrome import would block the
                // request for ~10 min and drain the daily Gemini quota in one
                // shot. Books are persisted with their import-time Chrome
                // metadata; the first AI_ANNOTATION_CAP get queued for the
                // background annotator (BookAnnotationService) below.
                int position = 0;
                for (ImportEntry e : chunk) {
                    Book book = new Book();
                    book.setBookshelf(shelf);
                    book.setUrl(e.url());
                    book.setTitle(e.title());
                    book.setSiteName(e.siteName());
                    book.setPosition(position++);
                    shelf.getBooks().add(book);
                    booksImported++;
                    if (annotateCandidates.size() < AI_ANNOTATION_CAP) {
                        annotateCandidates.add(book);
                    }
                }

                shelvesCreated++;
                remainingShelfSlots--;
                if (chunks > 1) chunkIndex++;
            }

            if (chunks > 1) {
                warnings.add(String.format("'%s' 폴더는 %d권이라 %d개 책장으로 나뉘었습니다.",
                    name, books.size(), chunks));
            }
        }

        // Flush so cascaded Book entities receive their generated IDs before
        // we extract them for the background annotator.
        bookRepository.flush();
        List<Long> annotateIds = annotateCandidates.stream().map(Book::getId).toList();
        if (booksImported > AI_ANNOTATION_CAP) {
            warnings.add(String.format(
                "AI 자동 정리는 처음 %d권만 백그라운드에서 진행돼요. 나머지 %d권은 가져온 그대로 들어왔어요. " +
                    "(책을 클릭하면 직접 정리할 수 있어요)",
                AI_ANNOTATION_CAP, booksImported - AI_ANNOTATION_CAP
            ));
        }

        ImportSummary summary = new ImportSummary("SHELVES", booksImported, shelvesCreated, storedCount, warnings);
        return new ImportOutcome(summary, annotateIds);
    }

    /**
     * Resolve which library the import targets. Explicit libraryId wins
     * (with ownership check); otherwise fall back to the user's currently
     * selected library; otherwise the first library.
     */
    private Library resolveTargetLibrary(Long userId, Long libraryId) {
        if (libraryId != null) {
            return libraryRepository.findByIdAndUserId(libraryId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Library not found"
                ));
        }
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Long currentId = user.getCurrentLibraryId();
        if (currentId != null) {
            Library lib = libraryRepository.findByIdAndUserId(currentId, userId).orElse(null);
            if (lib != null) return lib;
        }
        return libraryRepository.findFirstByUserIdOrderBySortOrderAscIdAsc(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Library not found"));
    }

    /**
     * Choose a shelf name for a unique folder path. Caller guarantees
     * the path hasn't been seen before; we only need to disambiguate
     * against names already taken by other paths.
     */
    private String pickShelfName(String folderPath, Set<String> takenNames) {
        if (folderPath == null || folderPath.isBlank()) {
            return uniquify("기타", takenNames);
        }
        String[] segments = folderPath.split(" / ");
        String leaf = segments[segments.length - 1].trim();
        if (leaf.isBlank()) leaf = "기타";

        if (!takenNames.contains(leaf)) return leaf;

        // Walk up the path prepending parent segments until we find an unused name.
        StringBuilder candidate = new StringBuilder(leaf);
        for (int depth = segments.length - 2; depth >= 0; depth--) {
            candidate.insert(0, segments[depth].trim() + " / ");
            if (!takenNames.contains(candidate.toString())) {
                return candidate.toString();
            }
        }
        // Fall back to a numeric suffix.
        return uniquify(leaf, takenNames);
    }

    private String uniquify(String base, Set<String> takenNames) {
        if (!takenNames.contains(base)) return base;
        int n = 2;
        while (takenNames.contains(base + " (" + n + ")")) n++;
        return base + " (" + n + ")";
    }
}
