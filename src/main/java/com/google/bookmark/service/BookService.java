package com.google.bookmark.service;

import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.StoredBook;
import com.google.bookmark.domain.User;
import com.google.bookmark.dto.AiAnalysis;
import com.google.bookmark.dto.BookResponse;
import com.google.bookmark.dto.CreateBookRequest;
import com.google.bookmark.dto.UpdateBookRequest;
import com.google.bookmark.dto.WebPageContent;
import com.google.bookmark.repository.BookRepository;
import com.google.bookmark.repository.BookshelfRepository;
import com.google.bookmark.repository.StoredBookRepository;
import com.google.bookmark.service.ai.AiService;
import com.google.bookmark.service.ai.WebMetadataFetcher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class BookService {

    private final BookRepository bookRepository;
    private final BookshelfRepository bookshelfRepository;
    private final StoredBookRepository storedBookRepository;
    private final AiService aiService;
    private final WebMetadataFetcher metadataFetcher;

    public BookResponse create(Long userId, CreateBookRequest req) {
        Bookshelf shelf = loadOwnedBookshelf(userId, req.bookshelfId());

        if (shelf.getBooks().size() >= shelf.getMaxBooks()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "이 책장은 가득 찼습니다. (" + shelf.getMaxBooks() + "권 한도)"
            );
        }

        User owner = shelf.getLibrary().getUser();
        String url = req.url().trim();

        Book book = new Book();
        book.setBookshelf(shelf);
        book.setUrl(url);
        book.setSiteName(req.siteName());
        if (req.coverColor() != null) book.setCoverColor(req.coverColor());
        if (req.titleColor() != null) book.setTitleColor(req.titleColor());
        book.setPosition(shelf.getBooks().size());

        // Title resolution. When the user supplied a title we use it verbatim
        // and skip metadata/AI entirely. Otherwise we fetch the page once and
        // either (a) use its <title> if it's already a clean brand-style label,
        // or (b) ask AI to produce a smart "사이트명 - 한 줄 요약" style title.
        // Tags/summary that AI returns alongside are still stored for future
        // search/filter even though the row UI no longer surfaces them.
        //
        // Cover color piggy-backs on the same AI call: if the user did NOT
        // pick a color (coverColorAutoPicked=true) AND we're going through
        // the AI path anyway, the backend overrides the lastUsedColor that
        // the frontend sent with theme-color or an AI-suggested hex.
        String suppliedTitle = req.title();
        boolean autoColor = Boolean.TRUE.equals(req.coverColorAutoPicked());
        if (suppliedTitle != null && !suppliedTitle.isBlank()) {
            book.setTitle(suppliedTitle.trim());
        } else {
            resolveTitleAndAnnotate(book, owner, url, autoColor);
        }

        shelf.getBooks().add(book);
        bookRepository.flush();
        return toResponse(book);
    }

    private void resolveTitleAndAnnotate(Book book, User owner, String url, boolean autoColor) {
        Optional<WebPageContent> metadataOpt = metadataFetcher.fetch(url);
        WebPageContent content = metadataOpt
            .orElse(new WebPageContent(url, null, book.getSiteName(), null, null));
        String fetchedTitle = content.title();
        String themeColor = content.themeColor();

        // theme-color is the cheapest brand-accurate color source — apply it
        // up-front when autoColor is on. AI may override below; if AI is off
        // or returns empty, theme-color stays.
        if (autoColor && themeColor != null) {
            book.setCoverColor(themeColor);
        }

        // Clean brand-style page titles (short, no chained separators) are
        // already what we want — skip the AI call and save quota. Color
        // already settled via theme-color (or stays as user's lastUsedColor).
        if (isCleanBrandTitle(fetchedTitle)) {
            book.setTitle(fetchedTitle.trim());
            return;
        }

        if (!owner.isAiFeaturesEnabled()) {
            book.setTitle(fallbackTitle(fetchedTitle, url));
            return;
        }

        // Best-effort AI annotation. Failures (fetch timeout, Gemini quota,
        // parse error) come back as AiAnalysis.empty() so we still get a title.
        AiAnalysis analysis = aiService.analyze(content, owner.getId());
        String smart = analysis.smartTitle();
        if (smart != null && !smart.isBlank()) {
            String trimmed = smart.trim();
            book.setTitle(trimmed.length() > 256 ? trimmed.substring(0, 256) : trimmed);
        } else {
            book.setTitle(fallbackTitle(fetchedTitle, url));
        }

        // AI-suggested color overrides theme-color when present. Already hex-
        // normalized by GeminiAiService.normalizeHex; null means model didn't
        // return one or the value was malformed.
        String aiColor = analysis.coverColor();
        if (autoColor && aiColor != null) {
            book.setCoverColor(aiColor);
        }

        if (analysis.tags() != null && !analysis.tags().isEmpty()) {
            book.setTags(new ArrayList<>(analysis.tags()));
        }
        if (analysis.summary() != null && !analysis.summary().isBlank()) {
            // 512 cap matches the column; clip rather than silently drop so we
            // still get a partial summary if the model overshoots its budget.
            String summary = analysis.summary();
            book.setAiSummary(summary.length() > 512 ? summary.substring(0, 512) : summary);
        }
    }

    /**
     * Heuristic: a page <title> is "clean enough" to use as-is when it's short
     * (≤ 30 chars) and doesn't carry the "site | category | post" separator
     * marks that signal a noisy chained title needing AI cleanup.
     */
    private static boolean isCleanBrandTitle(String t) {
        if (t == null || t.isBlank()) return false;
        String trimmed = t.trim();
        if (trimmed.length() > 30) return false;
        return !trimmed.contains(" - ") && !trimmed.contains(" | ")
            && !trimmed.contains(" – ") && !trimmed.contains(" — ")
            && !trimmed.contains(" :: ") && !trimmed.contains(" · ");
    }

    private static String fallbackTitle(String fetchedTitle, String url) {
        if (fetchedTitle != null && !fetchedTitle.isBlank()) return fetchedTitle.trim();
        try {
            String host = new URI(url).getHost();
            return host != null ? host : url;
        } catch (URISyntaxException e) {
            return url;
        }
    }

    public BookResponse update(Long userId, Long bookId, UpdateBookRequest req) {
        Book book = loadOwnedBook(userId, bookId);

        if (req.title() != null) book.setTitle(req.title().trim());
        if (req.siteName() != null) book.setSiteName(req.siteName());
        if (req.coverColor() != null) book.setCoverColor(req.coverColor());
        if (req.titleColor() != null) book.setTitleColor(req.titleColor());
        if (req.position() != null) book.setPosition(req.position());
        if (req.isFavorite() != null) book.setFavorite(req.isFavorite());

        if (req.bookshelfId() != null && !req.bookshelfId().equals(book.getBookshelf().getId())) {
            Bookshelf newShelf = loadOwnedBookshelf(userId, req.bookshelfId());
            if (newShelf.getBooks().size() >= newShelf.getMaxBooks()) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "옮기려는 책장이 가득 찼습니다."
                );
            }
            book.getBookshelf().getBooks().remove(book);
            newShelf.getBooks().add(book);
            book.setBookshelf(newShelf);
        }

        return toResponse(book);
    }

    public void delete(Long userId, Long bookId) {
        Book book = loadOwnedBook(userId, bookId);
        book.getBookshelf().getBooks().remove(book);
    }

    public void moveToStorage(Long userId, Long bookId) {
        Book book = loadOwnedBook(userId, bookId);

        StoredBook stored = new StoredBook();
        stored.setUser(book.getBookshelf().getLibrary().getUser());
        stored.setUrl(book.getUrl());
        stored.setTitle(book.getTitle());
        stored.setSiteName(book.getSiteName());
        stored.setOriginalFolder(book.getBookshelf().getTitle());
        storedBookRepository.save(stored);

        book.getBookshelf().getBooks().remove(book);
    }

    private Book loadOwnedBook(Long userId, Long bookId) {
        Book book = bookRepository.findById(bookId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));
        if (!book.getBookshelf().getLibrary().getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found");
        }
        return book;
    }

    private Bookshelf loadOwnedBookshelf(Long userId, Long bookshelfId) {
        Bookshelf shelf = bookshelfRepository.findById(bookshelfId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bookshelf not found"));
        if (!shelf.getLibrary().getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bookshelf not found");
        }
        return shelf;
    }

    private BookResponse toResponse(Book book) {
        return new BookResponse(
            book.getId(),
            book.getUrl(),
            book.getTitle(),
            book.getSiteName(),
            book.getCoverColor(),
            book.getTitleColor(),
            book.getPosition(),
            book.isFavorite(),
            book.getFaviconUrl(),
            book.getOgImageUrl(),
            book.getTags() == null ? java.util.List.of() : java.util.List.copyOf(book.getTags()),
            book.getAiSummary()
        );
    }
}
