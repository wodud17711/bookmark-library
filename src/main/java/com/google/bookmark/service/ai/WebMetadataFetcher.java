package com.google.bookmark.service.ai;

import com.google.bookmark.config.AiProperties;
import com.google.bookmark.dto.WebPageContent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

/**
 * Fetches a URL and pulls out the bits the LLM actually needs: title, site name,
 * and a body excerpt. We do NOT send full HTML — wasted tokens and a leak
 * vector for embedded scripts/credentials.
 *
 * Failures (timeout, 4xx, malformed HTML) return {@link Optional#empty()} so
 * callers can fall back to using just the URL + user-supplied title.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebMetadataFetcher {

    // We tried a self-identifying bot UA first ("…BookmarkLibraryBot/1.0…") but
    // a lot of Korean portals (DCInside, Naver cafe, etc.) reject non-browser
    // UAs at the edge — fetch returned empty and the row title fell back to
    // the URL host. The user adding the book is explicitly asking us to read
    // it on their behalf, so a normal-browser UA is fine.
    private static final String USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        + "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
    private static final int EXCERPT_MAX_CHARS = 1500;

    private final AiProperties props;

    public Optional<WebPageContent> fetch(String url) {
        if (url == null || url.isBlank()) return Optional.empty();
        try {
            Document doc = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(props.metadataFetch().timeoutSeconds() * 1000)
                .maxBodySize(props.metadataFetch().maxBytes())
                .followRedirects(true)
                .ignoreHttpErrors(false)
                .ignoreContentType(false)
                .get();

            String title = firstNonBlank(
                metaContent(doc, "og:title"),
                metaContent(doc, "twitter:title"),
                doc.title()
            );
            String siteName = firstNonBlank(
                metaContent(doc, "og:site_name"),
                metaContent(doc, "application-name")
            );
            String themeColor = extractThemeColor(doc);
            String excerpt = extractExcerpt(doc);

            return Optional.of(new WebPageContent(url, title, siteName, themeColor, excerpt));
        } catch (IOException | IllegalArgumentException e) {
            // INFO not DEBUG: when fetch fails the row title silently degrades
            // to the URL host and the AI prompt is gutted. The signal is worth
            // surfacing in normal logs while we iterate.
            log.info("Failed to fetch metadata for {}: {}", url, e.getMessage());
            return Optional.empty();
        }
    }

    private static String metaContent(Document doc, String property) {
        Element el = doc.selectFirst("meta[property=" + property + "]");
        if (el == null) el = doc.selectFirst("meta[name=" + property + "]");
        return el == null ? null : el.attr("content");
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }

    /**
     * Pulls a #RRGGBB string from <meta name="theme-color"> if the site provides
     * one. Sites sometimes ship rgb()/rgba()/named colors — we only accept the
     * hex form so it round-trips cleanly into our book-spine palette schema.
     */
    private static String extractThemeColor(Document doc) {
        String raw = metaContent(doc, "theme-color");
        if (raw == null) return null;
        String trimmed = raw.trim();
        // Accept #abc shorthand by expanding to #aabbcc.
        if (trimmed.matches("^#[0-9A-Fa-f]{3}$")) {
            char r = trimmed.charAt(1), g = trimmed.charAt(2), b = trimmed.charAt(3);
            return ("#" + r + r + g + g + b + b).toUpperCase();
        }
        if (trimmed.matches("^#[0-9A-Fa-f]{6}$")) {
            return trimmed.toUpperCase();
        }
        return null;
    }

    private static String extractExcerpt(Document doc) {
        String description = firstNonBlank(
            metaContent(doc, "og:description"),
            metaContent(doc, "description"),
            metaContent(doc, "twitter:description")
        );
        // Prefer the curated description meta; falls back to the first chunk of
        // body text so sites without OG tags still produce something useful.
        String base = description;
        if (base == null) {
            doc.select("script, style, nav, footer, header, aside, noscript").remove();
            base = doc.body() == null ? "" : doc.body().text();
        }
        if (base.length() > EXCERPT_MAX_CHARS) {
            base = base.substring(0, EXCERPT_MAX_CHARS);
        }
        return base;
    }
}
