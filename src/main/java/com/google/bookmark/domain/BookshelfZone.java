package com.google.bookmark.domain;

/**
 * Where on the library floor a bookshelf sits.
 * Public bookshelves appear in shared library URLs.
 * Private bookshelves are only visible to the owner — the "private room"
 * tucked away from visitors.
 */
public enum BookshelfZone {
    PUBLIC,
    PRIVATE
}
