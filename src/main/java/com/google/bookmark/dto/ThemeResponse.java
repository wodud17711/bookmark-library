package com.google.bookmark.dto;

public record ThemeResponse(
    String id,
    String displayName,
    String description,
    String tier,
    Integer priceKrw,
    String woodColor,
    String shadowColor,
    String wallColor,
    String frameColor,
    int sortOrder
) {}
