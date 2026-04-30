package com.google.bookmark.service;

import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.EntranceMood;
import com.google.bookmark.domain.Library;
import com.google.bookmark.dto.BookResponse;
import com.google.bookmark.dto.BookshelfResponse;
import com.google.bookmark.dto.LibraryResponse;
import com.google.bookmark.dto.UpdateLibraryRequest;
import com.google.bookmark.repository.LibraryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryService {

    private final LibraryRepository libraryRepository;

    public LibraryResponse getLibraryForUser(Long userId) {
        return toResponse(loadLibrary(userId));
    }

    @Transactional
    public LibraryResponse updateLibrary(Long userId, UpdateLibraryRequest request) {
        Library library = loadLibrary(userId);

        if (request.title() != null) {
            library.setTitle(request.title().trim());
        }
        if (request.paletteName() != null) {
            library.setPaletteName(request.paletteName());
        }
        if (request.welcomeMessage() != null) {
            // Empty string explicitly clears the message; allow it.
            library.setWelcomeMessage(request.welcomeMessage());
        }
        if (request.entranceMood() != null) {
            library.setEntranceMood(EntranceMood.valueOf(request.entranceMood()));
        }
        if (request.isPublic() != null) {
            library.setPublic(request.isPublic());
        }

        return toResponse(library);
    }

    private Library loadLibrary(Long userId) {
        return libraryRepository.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Library not found for user " + userId
            ));
    }

    private LibraryResponse toResponse(Library library) {
        return new LibraryResponse(
            library.getId(),
            library.getTitle(),
            library.getPaletteName(),
            library.getWelcomeMessage(),
            library.getEntranceMood().name(),
            library.isPublic(),
            library.getUser().getUsername(),
            library.getUser().getDisplayName(),
            library.getBookshelves().stream().map(this::toBookshelfResponse).toList()
        );
    }

    private BookshelfResponse toBookshelfResponse(Bookshelf shelf) {
        return new BookshelfResponse(
            shelf.getId(),
            shelf.getTitle(),
            shelf.getZone().name(),
            shelf.getPosition(),
            shelf.getMaxBooks(),
            shelf.getWoodColor(),
            shelf.getBooks().stream().map(this::toBookResponse).toList()
        );
    }

    private BookResponse toBookResponse(Book book) {
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
            book.getOgImageUrl()
        );
    }
}
