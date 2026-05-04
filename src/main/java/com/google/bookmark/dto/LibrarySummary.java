package com.google.bookmark.dto;

/**
 * Lightweight library descriptor for the library switcher dropdown.
 * Excludes the full bookshelf graph for cheap listing.
 */
public record LibrarySummary(
    Long id,
    String slug,
    String title,
    int sortOrder,
    boolean isPublic,
    boolean isCurrent,
    int bookshelfCount
) {}
