package com.google.bookmark.service;

import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.Library;
import com.google.bookmark.domain.StoredBook;
import com.google.bookmark.domain.User;
import com.google.bookmark.dto.SearchResponse;
import com.google.bookmark.dto.SearchResponse.BookHit;
import com.google.bookmark.dto.SearchResponse.StoredHit;
import com.google.bookmark.repository.BookRepository;
import com.google.bookmark.repository.StoredBookRepository;
import com.google.bookmark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private static final int MAX_RESULTS_PER_BUCKET = 50;

    private final BookRepository bookRepository;
    private final StoredBookRepository storedBookRepository;
    private final UserRepository userRepository;

    public SearchResponse search(Long userId, String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isBlank() || query.length() < 1) {
            return new SearchResponse(query, List.of(), List.of());
        }
        // SQL LIKE pattern, case-insensitive (the JPQL query lowers the column).
        String like = "%" + query.toLowerCase() + "%";
        var pageable = PageRequest.of(0, MAX_RESULTS_PER_BUCKET);

        Long currentLibraryId = userRepository.findById(userId)
            .map(User::getCurrentLibraryId)
            .orElse(null);

        List<Book> books = bookRepository.searchByUserId(userId, like, pageable);
        List<StoredBook> stored = storedBookRepository.searchByUserId(userId, like, pageable);

        return new SearchResponse(
            query,
            books.stream().map(b -> toBookHit(b, currentLibraryId)).toList(),
            stored.stream().map(this::toStoredHit).toList()
        );
    }

    private BookHit toBookHit(Book book, Long currentLibraryId) {
        Bookshelf shelf = book.getBookshelf();
        Library library = shelf.getLibrary();
        return new BookHit(
            book.getId(),
            book.getTitle(),
            book.getUrl(),
            book.getSiteName(),
            book.getCoverColor(),
            book.isFavorite(),
            book.getPosition(),
            shelf.getId(),
            shelf.getTitle(),
            shelf.getZone().name(),
            library.getId(),
            library.getSlug(),
            library.getTitle(),
            currentLibraryId != null && currentLibraryId.equals(library.getId())
        );
    }

    private StoredHit toStoredHit(StoredBook s) {
        return new StoredHit(
            s.getId(),
            s.getTitle(),
            s.getUrl(),
            s.getSiteName(),
            s.getOriginalFolder()
        );
    }
}
