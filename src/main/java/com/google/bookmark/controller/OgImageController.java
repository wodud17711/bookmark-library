package com.google.bookmark.controller;

import com.google.bookmark.service.LibraryService;
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
 * Slack) fetch this URL via the {@code <meta property="og:image">} tag in the
 * shared library page. No auth — must be reachable anonymously.
 *
 * <p>Bytes come from {@code Library.ogImage}, populated by the owner's
 * {@code POST /api/libraries/{id}/og-image} upload after the Pixi scene
 * draws. Returns 404 until the owner has visited their library on desktop
 * at least once.
 */
@RestController
@RequestMapping("/og")
@RequiredArgsConstructor
public class OgImageController {

    private final LibraryService libraryService;

    @GetMapping(value = "/{username}/{slug}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> serveOgImage(
        @PathVariable String username,
        @PathVariable String slug
    ) {
        byte[] bytes = libraryService.getPublicOgImageBytes(username, slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
            .body(bytes);
    }
}
