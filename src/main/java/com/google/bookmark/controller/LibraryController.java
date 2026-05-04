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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
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

    /**
     * Owner-uploaded snapshot of the Pixi floor plan, persisted as the
     * library's OG image. The frontend captures `canvas.toBlob('image/png')`
     * after the scene draws and posts it here. See {@code OgImageController}
     * for the public read side.
     */
    @PostMapping("/libraries/{id}/og-image")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uploadOgImage(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @RequestParam("image") MultipartFile image
    ) throws IOException {
        require(principal);
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일이 비어있어요.");
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일만 업로드할 수 있어요.");
        }
        libraryService.updateOgImage(principal.getUserId(), id, image.getBytes());
    }

    private static void require(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
