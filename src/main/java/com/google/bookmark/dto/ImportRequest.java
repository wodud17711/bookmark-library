package com.google.bookmark.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record ImportRequest(
    @NotNull @Pattern(regexp = "^(SHELVES|STORAGE)$") String mode,
    @NotEmpty @Valid List<ImportEntry> entries
) {}
