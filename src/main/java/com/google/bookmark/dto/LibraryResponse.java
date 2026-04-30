package com.google.bookmark.dto;

import java.util.List;

public record LibraryResponse(
    Long id,
    String title,
    String paletteName,
    String welcomeMessage,
    String entranceMood,
    boolean isPublic,
    String ownerUsername,
    String ownerDisplayName,
    List<BookshelfResponse> bookshelves
) {}
