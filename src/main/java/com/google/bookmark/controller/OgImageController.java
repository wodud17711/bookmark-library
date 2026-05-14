package com.google.bookmark.controller;

import com.google.bookmark.domain.Library;
import com.google.bookmark.service.LibraryService;
import com.google.bookmark.service.OgBannerRenderer;
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
import java.util.Optional;

/**
 * Public Open Graph image endpoint. Crawlers (Twitter, Discord, KakaoTalk,
 * Slack) fetch this URL via the {@code <meta property="og:image">} tag in
 * the shared library page. No auth — must be reachable anonymously.
 *
 * <p>Serves a per-library banner built from the owner's actual book spines
 * via {@link OgBannerRenderer}. Empty or sparse libraries fall through to
 * the static brand banner from {@code OgFallbackBannerProvider}, kept
 * around so a render failure still produces a valid PNG. 404 only when the
 * library doesn't exist or is private (no existence leak).
 */
@RestController
@RequestMapping("/og")
@RequiredArgsConstructor
public class OgImageController {

    private final LibraryService libraryService;
    private final OgBannerRenderer bannerRenderer;

    @GetMapping(value = "/{username}/{slug}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> serveOgImage(
        @PathVariable String username,
        @PathVariable String slug
    ) {
        Optional<Library> libOpt = libraryService.findPublicLibraryByUsernameAndSlug(username, slug);
        if (libOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        byte[] png = bannerRenderer.renderForLibrary(libOpt.get().getId());
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
            .body(png);
    }
}
