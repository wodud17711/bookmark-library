package com.google.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBookRequest(
    @NotNull Long bookshelfId,
    @NotBlank @Size(max = 2048) String url,
    @Size(max = 256) String title,
    @Size(max = 128) String siteName,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String coverColor,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String titleColor
) {}
