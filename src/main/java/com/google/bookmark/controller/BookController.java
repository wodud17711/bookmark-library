package com.google.bookmark.controller;

import com.google.bookmark.dto.BookResponse;
import com.google.bookmark.dto.CreateBookRequest;
import com.google.bookmark.dto.UpdateBookRequest;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.BookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookResponse create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateBookRequest request
    ) {
        require(principal);
        return bookService.create(principal.getUserId(), request);
    }

    @PatchMapping("/{id}")
    public BookResponse update(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateBookRequest request
    ) {
        require(principal);
        return bookService.update(principal.getUserId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        require(principal);
        bookService.delete(principal.getUserId(), id);
    }

    @PostMapping("/{id}/to-storage")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void moveToStorage(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        require(principal);
        bookService.moveToStorage(principal.getUserId(), id);
    }

    private static void require(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
