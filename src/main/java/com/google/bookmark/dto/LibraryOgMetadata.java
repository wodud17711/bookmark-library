package com.google.bookmark.dto;

import java.time.Instant;

/**
 * Trimmed view of {@code Library} used to render the {@code /u/{username}/{slug}}
 * HTML response with OG / Twitter card meta tags. Excludes books and other heavy
 * fields — bots only need the title, description text, and ownership info.
 *
 * <p>{@code updatedAt} is included as a cache-bust seed for the OG image URL:
 * the HTML controller emits {@code /og/{u}/{slug}?v={epoch}} so SNS crawlers
 * fetch a fresh preview after the owner edits the library.
 */
public record LibraryOgMetadata(
    Long libraryId,
    String title,
    String welcomeMessage,
    String ownerUsername,
    String ownerDisplayName,
    String slug,
    int bookshelfCount,
    Instant updatedAt
) {}
