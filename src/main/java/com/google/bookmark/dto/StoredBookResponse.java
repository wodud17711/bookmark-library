package com.google.bookmark.dto;

public record StoredBookResponse(
    Long id,
    String url,
    String title,
    String siteName,
    String originalFolder,
    String addedAt
) {}
