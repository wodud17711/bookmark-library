package com.google.bookmark.controller;

import com.google.bookmark.dto.BookshelfResponse;
import com.google.bookmark.dto.CreateBookshelfRequest;
import com.google.bookmark.dto.UpdateBookshelfRequest;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.BookshelfService;
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
@RequestMapping("/api/bookshelves")
@RequiredArgsConstructor
public class BookshelfController {

    private final BookshelfService bookshelfService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookshelfResponse create(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateBookshelfRequest request
    ) {
        require(principal);
        return bookshelfService.create(principal.getUserId(), request);
    }

    @PatchMapping("/{id}")
    public BookshelfResponse update(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateBookshelfRequest request
    ) {
        require(principal);
        return bookshelfService.update(principal.getUserId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        require(principal);
        bookshelfService.delete(principal.getUserId(), id);
    }

    private static void require(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
