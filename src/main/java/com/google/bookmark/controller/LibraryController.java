package com.google.bookmark.controller;

import com.google.bookmark.dto.LibraryResponse;
import com.google.bookmark.dto.UpdateLibraryRequest;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.LibraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    @GetMapping("/library")
    public LibraryResponse getMyLibrary(@AuthenticationPrincipal UserPrincipal principal) {
        require(principal);
        return libraryService.getLibraryForUser(principal.getUserId());
    }

    @PatchMapping("/library")
    public LibraryResponse updateMyLibrary(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody UpdateLibraryRequest request
    ) {
        require(principal);
        return libraryService.updateLibrary(principal.getUserId(), request);
    }

    private static void require(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
