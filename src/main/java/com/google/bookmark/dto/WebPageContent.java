package com.google.bookmark.dto;

public record WebPageContent(
    String url,
    String title,
    String siteName,
    /** Hex color (#RRGGBB) from the page's <meta name="theme-color"> if present
     *  and valid, otherwise null. Used both as an AI hint and as a fallback
     *  cover color when AI is disabled. */
    String themeColor,
    String excerpt
) {}
