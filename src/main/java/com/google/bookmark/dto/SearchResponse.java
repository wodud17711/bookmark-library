package com.google.bookmark.dto;

import java.util.List;

public record SearchResponse(
    String query,
    List<BookHit> books,
    List<StoredHit> stored
) {

    public record BookHit(
        Long id,
        String title,
        String url,
        String siteName,
        String coverColor,
        boolean isFavorite,
        int position,
        Long bookshelfId,
        String bookshelfTitle,
        String bookshelfZone,
        Long libraryId,
        String librarySlug,
        String libraryTitle,
        boolean isCurrentLibrary
    ) {}

    public record StoredHit(
        Long id,
        String title,
        String url,
        String siteName,
        String originalFolder
    ) {}
}
