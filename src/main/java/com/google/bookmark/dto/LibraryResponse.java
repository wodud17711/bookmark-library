package com.google.bookmark.dto;

import java.util.List;

public record LibraryResponse(
    Long id,
    String slug,
    String title,
    String paletteName,
    String floorPaletteName,
    String welcomeMessage,
    String entranceMood,
    boolean isPublic,
    String ownerUsername,
    String ownerDisplayName,
    List<BookshelfResponse> bookshelves
) {}
