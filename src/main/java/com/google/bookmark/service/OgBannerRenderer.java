package com.google.bookmark.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.BookshelfZone;
import com.google.bookmark.domain.Library;
import com.google.bookmark.repository.LibraryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Per-library Open Graph preview renderer. Builds a 1200×630 PNG showing the
 * library's actual book spines (up to 10, in their owner-picked
 * {@code coverColor}) on a cream background with walnut bands — no text, so
 * the JVM base image's Korean glyph coverage is irrelevant.
 *
 * <p>The render cost is non-trivial (BufferedImage draw + PNG encode ~30ms),
 * and the same URL is hit repeatedly by SNS crawlers, so results are cached
 * in-process via Caffeine. Cache TTL is intentionally short (5 minutes) so
 * book/shelf edits surface without explicit eviction wiring; the
 * {@code /og/{u}/{slug}?v={updatedAt-epoch}} URL emitted from
 * {@code PublicLibraryHtmlController} also forces SNS unfurlers to re-fetch
 * after the owner edits the library metadata itself.
 *
 * <p>When the library has fewer than 3 books we fall back to the static
 * brand banner — a near-empty bookshelf preview looks like a broken image.
 */
@Component
@Slf4j
public class OgBannerRenderer {

    private static final int WIDTH = 1200;
    private static final int HEIGHT = 630;
    private static final int BAND_HEIGHT = 64;
    private static final int MAX_SPINES = 10;
    private static final int MIN_SPINES_FOR_RENDER = 3;
    /** Horizontal play area for spines; 100px margin each side keeps the
     *  composition centered even when very few books are drawn. */
    private static final int USABLE_WIDTH = 1000;
    private static final int SPINE_W_MIN = 60;
    private static final int SPINE_W_MAX = 120;
    private static final int GAP_MIN = 20;
    private static final int GAP_MAX = 80;
    private static final int SHELF_THICKNESS = 24;
    private static final int SHELF_SHADOW = 3;
    private static final Color CREAM = new Color(0xFA, 0xF7, 0xF2);
    private static final Color WALNUT = new Color(0x8B, 0x5A, 0x3C);
    private static final Color FALLBACK_SPINE = new Color(0x3D, 0x28, 0x17);
    private static final String DEFAULT_WOOD_HEX = "#8B5A3C";

    private final LibraryRepository libraryRepository;
    private final OgFallbackBannerProvider fallbackBanner;

    private final Cache<Long, byte[]> cache = Caffeine.newBuilder()
        .maximumSize(500)
        .expireAfterWrite(Duration.ofMinutes(5))
        .build();

    public OgBannerRenderer(LibraryRepository libraryRepository, OgFallbackBannerProvider fallbackBanner) {
        this.libraryRepository = libraryRepository;
        this.fallbackBanner = fallbackBanner;
    }

    /**
     * Returns the cached PNG bytes for the given library, rendering on miss.
     * Falls back to the static brand banner when the library is missing,
     * private, or has too few books to produce a meaningful preview.
     *
     * <p>{@code @Transactional} so the cache-miss callback can walk the lazy
     * {@code bookshelves}/{@code books} graph without
     * {@code LazyInitializationException}. Cache hits short-circuit before
     * any DB work so the transactional overhead is negligible.
     */
    @Transactional(readOnly = true)
    public byte[] renderForLibrary(Long libraryId) {
        return cache.get(libraryId, this::render);
    }

    /** Removes the cached entry; the next request will re-render. */
    public void evict(Long libraryId) {
        cache.invalidate(libraryId);
    }

    private byte[] render(Long libraryId) {
        Optional<Library> libOpt = libraryRepository.findById(libraryId);
        if (libOpt.isEmpty() || !libOpt.get().isPublic()) {
            return fallbackBanner.getBytes();
        }
        Library library = libOpt.get();
        List<Book> books = collectPublicBooks(library);
        if (books.size() < MIN_SPINES_FOR_RENDER) {
            return fallbackBanner.getBytes();
        }
        // First PUBLIC shelf's woodColor — books across shelves share one shelf
        // band in the banner so it reads as a single library, not a stack of
        // shelves. Defaults to walnut when no PUBLIC shelf is present (shouldn't
        // happen given the MIN_SPINES guard above, but safe).
        String woodHex = library.getBookshelves().stream()
            .filter(s -> s.getZone() == BookshelfZone.PUBLIC)
            .map(Bookshelf::getWoodColor)
            .findFirst()
            .orElse(DEFAULT_WOOD_HEX);
        try {
            return drawSpines(books, parseHexOrFallback(woodHex));
        } catch (IOException e) {
            log.warn("OG banner render failed for library {} — serving fallback", libraryId, e);
            return fallbackBanner.getBytes();
        }
    }

    /**
     * Walks the library's PUBLIC bookshelves in their display order and
     * collects up to {@link #MAX_SPINES} books — favorites first (the
     * owner's curated highlights), then position order within each shelf.
     */
    private List<Book> collectPublicBooks(Library library) {
        List<Book> publicBooks = new ArrayList<>();
        for (Bookshelf shelf : library.getBookshelves()) {
            if (shelf.getZone() != BookshelfZone.PUBLIC) continue;
            publicBooks.addAll(shelf.getBooks());
        }
        publicBooks.sort(Comparator
            .comparing(Book::isFavorite, Comparator.reverseOrder())
            .thenComparing(Book::getPosition));
        return publicBooks.size() > MAX_SPINES
            ? publicBooks.subList(0, MAX_SPINES)
            : publicBooks;
    }

    private byte[] drawSpines(List<Book> books, Color woodColor) throws IOException {
        BufferedImage img = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            g.setColor(CREAM);
            g.fillRect(0, 0, WIDTH, HEIGHT);

            g.setColor(WALNUT);
            g.fillRect(0, 0, WIDTH, BAND_HEIGHT);
            g.fillRect(0, HEIGHT - BAND_HEIGHT, WIDTH, BAND_HEIGHT);

            int n = books.size();
            // Distribute the usable width as N "slots"; each slot is ~70% spine,
            // ~30% gap. Clamps keep small libraries from drawing absurdly thick
            // panels and large libraries from drawing pencil-thin slivers.
            int slot = USABLE_WIDTH / n;
            int spineW = clamp((int) (slot * 0.70), SPINE_W_MIN, SPINE_W_MAX);
            int gap = n > 1 ? clamp((int) (slot * 0.30), GAP_MIN, GAP_MAX) : 0;
            int totalW = n * spineW + (n - 1) * gap;
            int startX = (WIDTH - totalW) / 2;
            int floorY = HEIGHT - BAND_HEIGHT - 30;

            // Heights pseudo-vary by book id so different libraries draw distinct
            // silhouettes without dragging in extra fields. Same library reliably
            // renders the same layout (id is stable).
            for (int i = 0; i < n; i++) {
                Book book = books.get(i);
                int height = 220 + (int) (Math.abs((book.getId() == null ? i : book.getId()) * 37L) % 100);
                int x = startX + i * (spineW + gap);
                int y = floorY - height;

                g.setColor(parseHexOrFallback(book.getCoverColor()));
                g.fillRoundRect(x, y, spineW, height, 8, 8);

                // Subtle highlight strip for depth — same trick as the fallback banner.
                g.setColor(new Color(255, 255, 255, 30));
                g.fillRoundRect(x + 6, y + 14, 6, height - 28, 4, 4);
            }

            // Bookshelf board the spines sit on — full canvas width so it reads
            // as a wall-mounted shelf running the room's length, not a tray
            // tucked under the books. Color comes from the owner's shelf theme.
            g.setColor(woodColor);
            g.fillRect(0, floorY, WIDTH, SHELF_THICKNESS);
            g.setColor(darker(woodColor, 0.6));
            g.fillRect(0, floorY + SHELF_THICKNESS, WIDTH, SHELF_SHADOW);
        } finally {
            g.dispose();
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "PNG", baos);
        return baos.toByteArray();
    }

    private static int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private static Color darker(Color c, double factor) {
        return new Color(
            clamp((int) (c.getRed() * factor), 0, 255),
            clamp((int) (c.getGreen() * factor), 0, 255),
            clamp((int) (c.getBlue() * factor), 0, 255)
        );
    }

    private static Color parseHexOrFallback(String hex) {
        if (hex == null || hex.length() != 7 || hex.charAt(0) != '#') return FALLBACK_SPINE;
        try {
            return new Color(
                Integer.parseInt(hex.substring(1, 3), 16),
                Integer.parseInt(hex.substring(3, 5), 16),
                Integer.parseInt(hex.substring(5, 7), 16)
            );
        } catch (NumberFormatException e) {
            return FALLBACK_SPINE;
        }
    }
}
