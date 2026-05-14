package com.google.bookmark.controller;

import com.google.bookmark.dto.LibraryOgMetadata;
import com.google.bookmark.service.LibraryService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Optional;

/**
 * Server-side HTML for the public-share URL {@code /u/{username}/{slug}}.
 *
 * <p>Why a Spring controller and not the SPA: link-preview crawlers
 * (Twitterbot, kakaotalk-scrap, facebookexternalhit, Discordbot) fetch the
 * raw HTTP response and parse the {@code <head>} for OG meta tags WITHOUT
 * running JavaScript. The SPA's index.html is bundle-only; meta tags injected
 * by React useEffect appear too late for these bots. So Spring serves the
 * page directly with the OG tags already in the HTML; the included script
 * tag bootstraps the SPA so human visitors still get the live floor plan.
 *
 * <p>Vite's dev server proxies {@code /u/*} to this controller (see
 * {@code vite.config.ts}); in production the deployment platform (Vercel,
 * etc.) is configured to forward the same path to the backend.
 */
@RestController
@RequestMapping("/u")
@RequiredArgsConstructor
public class PublicLibraryHtmlController {

    private final LibraryService libraryService;

    /**
     * Path to the SPA bootstrap script as resolved by the user's browser
     * (relative to the page origin). Defaults to Vite's dev entry; deployments
     * override via the {@code SPA_SCRIPT_URL} env var with the hashed bundle
     * path produced by {@code vite build}.
     */
    @Value("${app.spa.script-url:/src/main.tsx}")
    private String spaScriptUrl;

    @GetMapping(value = "/{username}/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> renderPublicLibraryPage(
        @PathVariable String username,
        @PathVariable String slug,
        HttpServletRequest request
    ) {
        Optional<LibraryOgMetadata> meta = libraryService.getPublicLibraryOgMetadata(username, slug);
        String pageUrl = absoluteUrl(request);
        String html = meta.map(m -> renderHtml(m, pageUrl, request)).orElseGet(this::renderNotFoundHtml);
        // 200 even when not-found: the SPA will show its own "도서관을 찾을 수 없습니다"
        // screen using the same /api/u/{username}/{slug}/library lookup. Bots get a
        // generic but valid page so they don't drop the link from feeds.
        return ResponseEntity.ok()
            .header("Content-Type", "text/html; charset=UTF-8")
            .body(html);
    }

    private String renderHtml(LibraryOgMetadata m, String pageUrl, HttpServletRequest request) {
        String title = HtmlUtils.htmlEscape(m.title() + " · @" + m.ownerUsername() + " 도서관");
        String description = HtmlUtils.htmlEscape(buildDescription(m));
        String ogImageUrl = HtmlUtils.htmlEscape(buildOgImageUrl(request, m));
        String safePageUrl = HtmlUtils.htmlEscape(pageUrl);
        return baseHtml(title, description, ogImageUrl, safePageUrl);
    }

    private String renderNotFoundHtml() {
        // Generic, valid page so crawlers still get something. The SPA will then
        // load and replace it with the proper "not found" UI.
        String title = HtmlUtils.htmlEscape("도서관을 찾을 수 없습니다 · 북마크 도서관");
        String description = HtmlUtils.htmlEscape("비공개 상태이거나 존재하지 않는 도서관입니다.");
        return baseHtml(title, description, "", "");
    }

    private String buildDescription(LibraryOgMetadata m) {
        String fromWelcome = m.welcomeMessage() != null ? m.welcomeMessage().trim() : "";
        if (!fromWelcome.isEmpty()) {
            return truncate(fromWelcome, 200);
        }
        String owner = (m.ownerDisplayName() != null && !m.ownerDisplayName().isBlank())
            ? m.ownerDisplayName()
            : m.ownerUsername();
        return owner + "님의 북마크 도서관 — 책장 " + m.bookshelfCount() + "개";
    }

    private String buildOgImageUrl(HttpServletRequest request, LibraryOgMetadata m) {
        String origin = request.getScheme() + "://" + request.getServerName()
            + (isDefaultPort(request) ? "" : ":" + request.getServerPort());
        // ?v={updatedAt-epoch} forces SNS unfurlers (Twitter, Discord, KakaoTalk)
        // to fetch a fresh preview once the owner edits the library — same image
        // URL with new query string = cache miss on their side. Books-only edits
        // surface via the renderer's 5-minute Caffeine TTL; library-level edits
        // bump updatedAt and bust the URL immediately.
        long version = m.updatedAt() != null ? m.updatedAt().toEpochMilli() : 0L;
        return origin + "/og/" + urlSegment(m.ownerUsername()) + "/" + urlSegment(m.slug())
            + "?v=" + version;
    }

    private static boolean isDefaultPort(HttpServletRequest request) {
        int port = request.getServerPort();
        return ("http".equals(request.getScheme()) && port == 80)
            || ("https".equals(request.getScheme()) && port == 443);
    }

    private static String absoluteUrl(HttpServletRequest request) {
        StringBuffer u = request.getRequestURL();
        String q = request.getQueryString();
        return q == null ? u.toString() : u + "?" + q;
    }

    private static String urlSegment(String s) {
        return java.net.URLEncoder.encode(s == null ? "" : s, java.nio.charset.StandardCharsets.UTF_8);
    }

    private static String truncate(String s, int max) {
        if (s.length() <= max) return s;
        return s.substring(0, max - 1) + "…";
    }

    /**
     * Single HTML template for both found and not-found cases. Same shell as
     * {@code frontend/index.html} so the SPA bootstraps identically; the only
     * additions are the OG / Twitter card meta tags that crawlers parse.
     */
    private String baseHtml(String title, String description, String ogImageUrl, String pageUrl) {
        StringBuilder ogTags = new StringBuilder();
        if (!ogImageUrl.isEmpty()) {
            ogTags.append("    <meta property=\"og:image\" content=\"").append(ogImageUrl).append("\" />\n");
            ogTags.append("    <meta name=\"twitter:image\" content=\"").append(ogImageUrl).append("\" />\n");
        }
        if (!pageUrl.isEmpty()) {
            ogTags.append("    <meta property=\"og:url\" content=\"").append(pageUrl).append("\" />\n");
        }

        return "<!doctype html>\n"
            + "<html lang=\"ko\">\n"
            + "  <head>\n"
            + "    <meta charset=\"UTF-8\" />\n"
            + "    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/favicon.svg\" />\n"
            + "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n"
            + "    <link rel=\"preconnect\" href=\"https://cdn.jsdelivr.net\" crossorigin />\n"
            + "    <link\n"
            + "      rel=\"stylesheet\"\n"
            + "      href=\"https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css\"\n"
            + "    />\n"
            + "    <title>" + title + "</title>\n"
            + "    <meta name=\"description\" content=\"" + description + "\" />\n"
            + "    <meta property=\"og:title\" content=\"" + title + "\" />\n"
            + "    <meta property=\"og:description\" content=\"" + description + "\" />\n"
            + "    <meta property=\"og:type\" content=\"website\" />\n"
            + "    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n"
            + "    <meta name=\"twitter:title\" content=\"" + title + "\" />\n"
            + "    <meta name=\"twitter:description\" content=\"" + description + "\" />\n"
            + ogTags
            + "  </head>\n"
            + "  <body>\n"
            + "    <div id=\"root\"></div>\n"
            + "    <script type=\"module\" src=\"" + HtmlUtils.htmlEscape(spaScriptUrl) + "\"></script>\n"
            + "  </body>\n"
            + "</html>\n";
    }
}
