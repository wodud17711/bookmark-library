package com.google.bookmark.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record MoveStoredBooksRequest(
    @NotEmpty List<Long> storedBookIds,
    @NotNull Long bookshelfId
) {}
