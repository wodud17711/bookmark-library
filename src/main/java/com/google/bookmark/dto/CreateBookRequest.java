package com.google.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBookRequest(
    @NotNull Long bookshelfId,
    @NotBlank
    @Size(max = 2048)
    // Reject javascript:/data:/file:/vbscript: schemes — these become
    // <a href="..."> targets in shared library views and would execute
    // in the visitor's context. Only http/https links are valid bookmarks.
    @Pattern(regexp = "^https?://.+", message = "URL은 http:// 또는 https:// 로 시작해야 합니다.")
    String url,
    @Size(max = 256) String title,
    @Size(max = 128) String siteName,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String coverColor,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String titleColor,
    /** True when the user did NOT touch BookCoverPicker — the supplied
     *  coverColor is the lastUsedColor default and the backend may override
     *  it with a theme-color or AI-suggested spine color. Null is treated
     *  as false for back-compat with older clients. */
    Boolean coverColorAutoPicked
) {}
