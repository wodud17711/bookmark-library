package com.google.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * A single bookmark from the import source. The frontend parses the
 * Netscape HTML and sends a flat list of these.
 */
public record ImportEntry(
    @NotBlank
    @Size(max = 2048)
    // Same scheme allowlist as CreateBookRequest — Chrome export can
    // contain javascript: bookmarklets that we mustn't propagate into
    // public libraries.
    @Pattern(regexp = "^https?://.+", message = "URL은 http:// 또는 https:// 로 시작해야 합니다.")
    String url,
    @NotBlank @Size(max = 256) String title,
    @Size(max = 128) String siteName,
    /** Slash-separated folder path, e.g. "북마크바 / 자료 / 프론트엔드". Empty for root. */
    @Size(max = 512) String folderPath
) {}
