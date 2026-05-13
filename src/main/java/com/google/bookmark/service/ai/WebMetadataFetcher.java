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

    private static final String USER_AGENT =
        "Mozilla/5.0 (compatible; BookmarkLibraryBot/1.0; +https://bookmark-library-iota.vercel.app)";
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
            String excerpt = extractExcerpt(doc);

            return Optional.of(new WebPageContent(url, title, siteName, excerpt));
        } catch (IOException | IllegalArgumentException e) {
            log.debug("Failed to fetch metadata for {}: {}", url, e.getMessage());
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
