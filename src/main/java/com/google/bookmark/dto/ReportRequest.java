package com.google.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportRequest(
    @NotNull Long libraryId,
    @NotBlank String reason,
    @Size(max = 1000) String details
) {}
