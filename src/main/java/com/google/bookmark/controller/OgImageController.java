package com.google.bookmark.controller;

import com.google.bookmark.service.LibraryService;
import com.google.bookmark.service.OgFallbackBannerProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

/**
 * Public Open Graph image endpoint. Crawlers (Twitter, Discord, KakaoTalk,
 * Slack) fetch this URL via the {@code <meta property="og:image">} tag in
 * the shared library page. No auth — must be reachable anonymously.
 *
 * <p>Always serves the static brand banner from
 * {@link OgFallbackBannerProvider}. Per-library captured snapshots used to
 * live in {@code Library.ogImage} but were removed to keep DB usage flat
 * (and to put mobile-only owners on equal footing — there's no longer a
 * "desktop visit captured your image, mobile didn't" gap). 404 only when
 * the library doesn't exist or is private (no leak).
 */
@RestController
@RequestMapping("/og")
@RequiredArgsConstructor
public class OgImageController {

    private final LibraryService libraryService;
    private final OgFallbackBannerProvider fallbackBanner;

    @GetMapping(value = "/{username}/{slug}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> serveOgImage(
        @PathVariable String username,
        @PathVariable String slug
    ) {
        if (!libraryService.isPublicLibraryPresent(username, slug)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
            .body(fallbackBanner.getBytes());
    }
}
