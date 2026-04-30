package com.google.bookmark.controller;

import com.google.bookmark.dto.MoveStoredBooksRequest;
import com.google.bookmark.dto.StoredBookResponse;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.StoredBookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final StoredBookService storedBookService;

    @GetMapping
    public List<StoredBookResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        require(principal);
        return storedBookService.listForUser(principal.getUserId());
    }

    @GetMapping("/count")
    public Map<String, Long> count(@AuthenticationPrincipal UserPrincipal principal) {
        require(principal);
        return Map.of("count", storedBookService.countForUser(principal.getUserId()));
    }

    @PostMapping("/move")
    public Map<String, Integer> move(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody MoveStoredBooksRequest request
    ) {
        require(principal);
        int moved = storedBookService.moveToShelf(principal.getUserId(), request);
        return Map.of("moved", moved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        require(principal);
        storedBookService.delete(principal.getUserId(), id);
    }

    private static void require(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
