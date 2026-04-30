package com.google.bookmark.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateBookRequest(
    @Size(min = 1, max = 256) String title,
    @Size(max = 128) String siteName,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String coverColor,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String titleColor,
    @Min(0) Integer position,
    Long bookshelfId,
    Boolean isFavorite
) {}
