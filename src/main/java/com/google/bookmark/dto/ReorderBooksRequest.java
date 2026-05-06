package com.google.bookmark.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Body for {@code PATCH /api/bookshelves/{id}/book-order}. The list contains
 * exactly the IDs of all books currently on the target shelf, in the desired
 * new order. The server assigns sequential {@code position} values
 * (0..n-1) based on this order.
 */
public record ReorderBooksRequest(
    @NotNull @NotEmpty List<Long> orderedBookIds
) {}
