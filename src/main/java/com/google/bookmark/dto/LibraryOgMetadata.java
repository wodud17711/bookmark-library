package com.google.bookmark.dto;

/**
 * Trimmed view of {@code Library} used to render the {@code /u/{username}/{slug}}
 * HTML response with OG / Twitter card meta tags. Excludes books and other heavy
 * fields — bots only need the title, description text, and ownership info.
 */
public record LibraryOgMetadata(
    String title,
    String welcomeMessage,
    String ownerUsername,
    String ownerDisplayName,
    String slug,
    int bookshelfCount,
    boolean hasOgImage
) {}
