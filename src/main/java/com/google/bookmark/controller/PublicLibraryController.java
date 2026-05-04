package com.google.bookmark.controller;

import com.google.bookmark.dto.LibraryResponse;
import com.google.bookmark.service.LibraryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints under {@code /api/u/**} are open to unauthenticated visitors so
 * shared library URLs work without sign-in. SecurityConfig must allow this
 * path prefix.
 */
@RestController
@RequestMapping("/api/u")
@RequiredArgsConstructor
public class PublicLibraryController {

    private final LibraryService libraryService;

    /** Specific public library for {@code /u/{username}/{slug}}. */
    @GetMapping("/{username}/{slug}/library")
    public LibraryResponse getPublicLibraryBySlug(
        @PathVariable String username,
        @PathVariable String slug
    ) {
        return libraryService.getPublicLibrary(username, slug);
    }

    /** Legacy short URL: returns first public library for the username. */
    @GetMapping("/{username}/library")
    public LibraryResponse getFirstPublicLibrary(@PathVariable String username) {
        return libraryService.getFirstPublicLibrary(username);
    }
}
