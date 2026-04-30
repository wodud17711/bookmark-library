package com.google.bookmark.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateBookshelfRequest(
    @Size(min = 1, max = 128) String title,
    @Pattern(regexp = "^(PUBLIC|PRIVATE)$") String zone,
    @Min(0) Integer position,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String woodColor
) {}
