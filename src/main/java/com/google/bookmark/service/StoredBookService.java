package com.google.bookmark.service;

import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.StoredBook;
import com.google.bookmark.dto.MoveStoredBooksRequest;
import com.google.bookmark.dto.StoredBookResponse;
import com.google.bookmark.repository.BookshelfRepository;
import com.google.bookmark.repository.StoredBookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class StoredBookService {

    private final StoredBookRepository storedBookRepository;
    private final BookshelfRepository bookshelfRepository;

    @Transactional(readOnly = true)
    public List<StoredBookResponse> listForUser(Long userId) {
        return storedBookRepository.findAllByUserIdOrderByAddedAtAsc(userId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public long countForUser(Long userId) {
        return storedBookRepository.countByUserId(userId);
    }

    public int moveToShelf(Long userId, MoveStoredBooksRequest request) {
        Bookshelf shelf = bookshelfRepository.findById(request.bookshelfId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bookshelf not found"));
        if (!shelf.getLibrary().getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bookshelf not found");
        }

        int spaceLeft = shelf.getMaxBooks() - shelf.getBooks().size();
        if (spaceLeft <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "선택한 책장이 가득 찼습니다.");
        }
        if (request.storedBookIds().size() > spaceLeft) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                String.format("책장에 %d권만 더 들어갈 수 있는데 %d권을 옮기려고 합니다.",
                    spaceLeft, request.storedBookIds().size()));
        }

        List<StoredBook> stored = storedBookRepository.findAllById(request.storedBookIds());
        for (StoredBook sb : stored) {
            if (!sb.getUser().getId().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Stored book not found");
            }
        }

        int basePosition = shelf.getBooks().size();
        int moved = 0;
        for (StoredBook sb : stored) {
            Book book = new Book();
            book.setBookshelf(shelf);
            book.setUrl(sb.getUrl());
            book.setTitle(sb.getTitle());
            book.setSiteName(sb.getSiteName());
            book.setPosition(basePosition + moved);
            shelf.getBooks().add(book);
            moved++;
        }
        storedBookRepository.deleteAll(stored);
        return moved;
    }

    public void delete(Long userId, Long storedBookId) {
        StoredBook sb = storedBookRepository.findById(storedBookId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found"));
        if (!sb.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        }
        storedBookRepository.delete(sb);
    }

    private StoredBookResponse toResponse(StoredBook sb) {
        return new StoredBookResponse(
            sb.getId(),
            sb.getUrl(),
            sb.getTitle(),
            sb.getSiteName(),
            sb.getOriginalFolder(),
            sb.getAddedAt().toString()
        );
    }
}
