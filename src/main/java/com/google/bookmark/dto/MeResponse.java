package com.google.bookmark.dto;

public record MeResponse(
    Long id,
    String email,
    String displayName,
    String username,
    String pictureUrl
) {}
