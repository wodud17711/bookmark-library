package com.google.bookmark.dto;

public record FloorThemeResponse(
    String id,
    String displayName,
    String description,
    String tier,
    Integer priceKrw,
    String primaryColor,
    String shadowColor,
    int sortOrder
) {}
