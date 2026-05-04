package com.google.bookmark.service;

import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.BookshelfZone;
import com.google.bookmark.domain.Library;
import com.google.bookmark.dto.BookshelfResponse;
import com.google.bookmark.dto.CreateBookshelfRequest;
import com.google.bookmark.dto.UpdateBookshelfRequest;
import com.google.bookmark.domain.User;
import com.google.bookmark.repository.BookshelfRepository;
import com.google.bookmark.repository.LibraryRepository;
import com.google.bookmark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BookshelfService {

    private final BookshelfRepository bookshelfRepository;
    private final LibraryRepository libraryRepository;
    private final UserRepository userRepository;

    /** Add to user's currently selected library (uses first if none selected). */
    public BookshelfResponse create(Long userId, CreateBookshelfRequest req) {
        Library library = resolveCurrentLibrary(userId);
        return createIn(library, req);
    }

    /** Add to a specific library, with ownership check. */
    public BookshelfResponse createInLibrary(Long userId, Long libraryId, CreateBookshelfRequest req) {
        Library library = libraryRepository.findByIdAndUserId(libraryId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Library not found"));
        return createIn(library, req);
    }

    private Library resolveCurrentLibrary(Long userId) {
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

    private BookshelfResponse createIn(Library library, CreateBookshelfRequest req) {
        if (library.getBookshelves().size() >= Library.MAX_BOOKSHELVES) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                String.format(
                    "한 도서관에 책장을 %d개까지만 둘 수 있어요. " +
                    "새 도서관을 만들거나 다른 책장을 정리해주세요.",
                    Library.MAX_BOOKSHELVES
                )
            );
        }

        Bookshelf shelf = new Bookshelf();
        shelf.setTitle(req.title().trim());
        shelf.setZone(req.zone() != null ? BookshelfZone.valueOf(req.zone()) : BookshelfZone.PUBLIC);
        if (req.woodColor() != null) {
            shelf.setWoodColor(req.woodColor());
        }
        shelf.setPosition(nextPosition(library, shelf.getZone()));
        library.addBookshelf(shelf);

        bookshelfRepository.flush();
        return toResponse(shelf);
    }

    public BookshelfResponse update(Long userId, Long bookshelfId, UpdateBookshelfRequest req) {
        Bookshelf shelf = loadOwnedBookshelf(userId, bookshelfId);

        if (req.title() != null) shelf.setTitle(req.title().trim());
        if (req.zone() != null) shelf.setZone(BookshelfZone.valueOf(req.zone()));
        if (req.position() != null) shelf.setPosition(req.position());
        if (req.woodColor() != null) shelf.setWoodColor(req.woodColor());

        return toResponse(shelf);
    }

    public void delete(Long userId, Long bookshelfId) {
        Bookshelf shelf = loadOwnedBookshelf(userId, bookshelfId);
        Library library = shelf.getLibrary();
        library.getBookshelves().remove(shelf);
        // orphanRemoval=true on Library.bookshelves cascades the delete.
    }

    private Bookshelf loadOwnedBookshelf(Long userId, Long bookshelfId) {
        Bookshelf shelf = bookshelfRepository.findById(bookshelfId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bookshelf not found"));
        if (!shelf.getLibrary().getUser().getId().equals(userId)) {
            // Don't leak existence — same response as not-found.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bookshelf not found");
        }
        return shelf;
    }

    private int nextPosition(Library library, BookshelfZone zone) {
        return library.getBookshelves().stream()
            .filter(s -> s.getZone() == zone)
            .mapToInt(Bookshelf::getPosition)
            .max()
            .orElse(-1) + 1;
    }

    private BookshelfResponse toResponse(Bookshelf shelf) {
        List<com.google.bookmark.dto.BookResponse> books = shelf.getBooks().stream()
            .map(b -> new com.google.bookmark.dto.BookResponse(
                b.getId(), b.getUrl(), b.getTitle(), b.getSiteName(),
                b.getCoverColor(), b.getTitleColor(),
                b.getPosition(), b.isFavorite(),
                b.getFaviconUrl(), b.getOgImageUrl()
            ))
            .toList();
        return new BookshelfResponse(
            shelf.getId(),
            shelf.getTitle(),
            shelf.getZone().name(),
            shelf.getPosition(),
            shelf.getMaxBooks(),
            shelf.getWoodColor(),
            books.isEmpty() ? Collections.emptyList() : books
        );
    }
}
