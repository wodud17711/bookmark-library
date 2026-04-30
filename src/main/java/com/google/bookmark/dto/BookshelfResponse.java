package com.google.bookmark.dto;

import java.util.List;

public record BookshelfResponse(
    Long id,
    String title,
    String zone,
    int position,
    int maxBooks,
    String woodColor,
    List<BookResponse> books
) {}
