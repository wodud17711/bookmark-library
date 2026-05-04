package com.google.bookmark.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record ImportRequest(
    @NotNull @Pattern(regexp = "^(SHELVES|STORAGE)$") String mode,
    /**
     * Target library for SHELVES mode. Null falls back to the user's
     * current library. Ignored for STORAGE mode (storage is user-scoped).
     */
    Long libraryId,
    @NotEmpty @Valid List<ImportEntry> entries
) {}
