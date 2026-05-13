package com.google.bookmark.dto;

import java.util.List;

public record BookResponse(
    Long id,
    String url,
    String title,
    String siteName,
    String coverColor,
    String titleColor,
    int position,
    boolean isFavorite,
    String faviconUrl,
    String ogImageUrl,
    List<String> tags,
    String aiSummary
) {}
