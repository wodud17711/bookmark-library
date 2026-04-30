package com.google.bookmark.service;

import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.BookshelfZone;
import com.google.bookmark.domain.Library;
import com.google.bookmark.dto.BookshelfResponse;
import com.google.bookmark.dto.CreateBookshelfRequest;
import com.google.bookmark.dto.UpdateBookshelfRequest;
import com.google.bookmark.repository.BookshelfRepository;
import com.google.bookmark.repository.LibraryRepository;
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

    public BookshelfResponse create(Long userId, CreateBookshelfRequest req) {
        Library library = libraryRepository.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Library not found"));

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
