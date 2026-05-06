package com.google.bookmark.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Bytes for the static fallback OG banner served when a public library has no
 * captured snapshot yet — typical for users who only ever visit on mobile, since
 * client-side capture only fires on desktop viewport for 16:9 consistency.
 *
 * <p>Replacement: drop a 1200×630 PNG at
 * {@code src/main/resources/og-default-banner.png} and it will be loaded as-is.
 * Without an override, a minimal text-free placeholder is generated at startup
 * (cream background, walnut bands, five book spines) so deployments without
 * Korean fonts in the JDK base image still produce a clean image.
 */
@Component
@Slf4j
public class OgFallbackBannerProvider {

    private static final String OVERRIDE_RESOURCE = "og-default-banner.png";
    private static final int WIDTH = 1200;
    private static final int HEIGHT = 630;
    private static final Color CREAM = new Color(0xFA, 0xF7, 0xF2);
    private static final Color WALNUT = new Color(0x8B, 0x5A, 0x3C);
    private static final Color WALNUT_DARK = new Color(0x6E, 0x44, 0x2A);
    private static final Color INK = new Color(0x2A, 0x25, 0x20);

    private byte[] bytes;

    @PostConstruct
    void init() throws IOException {
        ClassPathResource override = new ClassPathResource(OVERRIDE_RESOURCE);
        if (override.exists()) {
            try (InputStream in = override.getInputStream()) {
                this.bytes = in.readAllBytes();
            }
            log.info("OG fallback banner loaded from classpath:{} ({} bytes)", OVERRIDE_RESOURCE, bytes.length);
        } else {
            this.bytes = renderPlaceholder();
            log.info("OG fallback banner generated as placeholder ({} bytes). Drop classpath:{} to override.",
                bytes.length, OVERRIDE_RESOURCE);
        }
    }

    public byte[] getBytes() {
        return bytes;
    }

    private static byte[] renderPlaceholder() throws IOException {
        BufferedImage img = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            g.setColor(CREAM);
            g.fillRect(0, 0, WIDTH, HEIGHT);

            int bandH = 64;
            g.setColor(WALNUT);
            g.fillRect(0, 0, WIDTH, bandH);
            g.fillRect(0, HEIGHT - bandH, WIDTH, bandH);

            // Five book spines centered, varying heights / colors. Acts as a recognizable
            // "library" mark without depending on Korean glyphs being available in the JVM.
            int spineCount = 5;
            int spineW = 80;
            int gap = 28;
            int totalW = spineCount * spineW + (spineCount - 1) * gap;
            int startX = (WIDTH - totalW) / 2;
            int floorY = HEIGHT - bandH - 30;
            int[] heights = {220, 280, 240, 300, 250};
            Color[] colors = {WALNUT, INK, WALNUT_DARK, WALNUT, INK};
            for (int i = 0; i < spineCount; i++) {
                int x = startX + i * (spineW + gap);
                int y = floorY - heights[i];
                g.setColor(colors[i]);
                g.fillRoundRect(x, y, spineW, heights[i], 8, 8);
                g.setColor(new Color(255, 255, 255, 30));
                g.fillRoundRect(x + 6, y + 14, 6, heights[i] - 28, 4, 4);
            }
        } finally {
            g.dispose();
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "PNG", baos);
        return baos.toByteArray();
    }
}
