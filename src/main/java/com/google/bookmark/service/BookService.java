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

        Book book = new Book();
        book.setBookshelf(shelf);
        book.setUrl(req.url().trim());
        book.setTitle(deriveTitle(req.title(), req.url()));
        book.setSiteName(req.siteName());
        if (req.coverColor() != null) book.setCoverColor(req.coverColor());
        if (req.titleColor() != null) book.setTitleColor(req.titleColor());
        book.setPosition(shelf.getBooks().size());

        shelf.getBooks().add(book);
        bookRepository.flush();

        // Best-effort AI annotation. Anything that fails here (fetch timeout,
        // Gemini quota, parse error) is swallowed by AiService and returns
        // empty — book creation must never depend on the model being up.
        annotateWithAi(book, shelf.getLibrary().getUser());

        return toResponse(book);
    }

    private void annotateWithAi(Book book, User owner) {
        if (!owner.isAiFeaturesEnabled()) return;
        WebPageContent content = metadataFetcher.fetch(book.getUrl())
            .orElse(new WebPageContent(book.getUrl(), book.getTitle(), book.getSiteName(), null));
        AiAnalysis analysis = aiService.analyze(content, owner.getId());
        if (analysis.isEmpty()) return;
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

    /** Falls back to the URL host when the user didn't supply a title. */
    private String deriveTitle(String supplied, String url) {
        if (supplied != null && !supplied.isBlank()) {
            return supplied.trim();
        }
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            return host != null ? host : url;
        } catch (URISyntaxException e) {
            return url;
        }
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
