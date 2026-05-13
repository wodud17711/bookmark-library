package com.google.bookmark.dto;

public record WebPageContent(
    String url,
    String title,
    String siteName,
    String excerpt
) {}
