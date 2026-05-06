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
 * Slack) fetch this URL via the {@code <meta property="og:image">} tag in the
 * shared library page. No auth — must be reachable anonymously.
 *
 * <p>Resolution order for any public library:
 * <ol>
 *   <li>{@code Library.ogImage} captured by the owner's browser
 *       (POST {@code /api/libraries/{id}/og-image}) — the user's actual floor plan.</li>
 *   <li>Static fallback banner from {@link OgFallbackBannerProvider} —
 *       used until the owner visits on a desktop viewport at least once.
 *       Mobile-only users effectively always see this.</li>
 * </ol>
 *
 * <p>404 only when the library doesn't exist or is private (no leak).
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
        byte[] bytes = libraryService.getPublicOgImageBytes(username, slug)
            .orElseGet(() -> {
                if (libraryService.isPublicLibraryPresent(username, slug)) {
                    return fallbackBanner.getBytes();
                }
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            });
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
            .body(bytes);
    }
}
