package com.google.bookmark.dto;

import java.util.List;

public record ImportSummary(
    String mode,
    int booksImported,
    int shelvesCreated,
    int storedCount,
    List<String> warnings
) {}
