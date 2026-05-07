package com.google.bookmark.controller;

import com.google.bookmark.dto.CreateLibraryRequest;
import com.google.bookmark.dto.LibraryResponse;
import com.google.bookmark.dto.LibrarySummary;
import com.google.bookmark.dto.UpdateLibraryRequest;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.LibraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    /** Currently selected library (full data including bookshelves). */
    @GetMapping("/library")
    public LibraryResponse getCurrentLibrary(@AuthenticationPrincipal UserPrincipal principal) {
        require(principal);
        return libraryService.getCurrentLibrary(principal.getUserId());
    }

    /** Update currently selected library. */
    @PatchMapping("/library")
    public LibraryResponse updateCurrentLibrary(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody UpdateLibraryRequest request
    ) {
        require(principal);
        return libraryService.updateCurrentLibrary(principal.getUserId(), request);
    }

    /** Lightweight list of all of the user's libraries (for the switcher). */
    @GetMapping("/libraries")
    public List<LibrarySummary> listMyLibraries(@AuthenticationPrincipal UserPrincipal principal) {
        require(principal);
        return libraryService.listLibrariesForUser(principal.getUserId());
    }

    @PostMapping("/libraries")
    @ResponseStatus(HttpStatus.CREATED)
    public LibraryResponse createLibrary(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateLibraryRequest request
    ) {
        require(principal);
        return libraryService.createLibrary(principal.getUserId(), request);
    }

    @PatchMapping("/libraries/{id}")
    public LibraryResponse updateLibrary(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody UpdateLibraryRequest request
    ) {
        require(principal);
        return libraryService.updateLibraryById(principal.getUserId(), id, request);
    }

    /** Switch which library is "current" for this user. Returns the new current library. */
    @PostMapping("/libraries/{id}/switch")
    public LibraryResponse switchCurrentLibrary(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        require(principal);
        return libraryService.switchCurrentLibrary(principal.getUserId(), id);
    }

    private static void require(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
