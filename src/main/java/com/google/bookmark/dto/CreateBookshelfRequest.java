package com.google.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBookshelfRequest(
    @NotBlank @Size(max = 128) String title,
    @Pattern(regexp = "^(PUBLIC|PRIVATE)$") String zone,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String woodColor
) {}
