package com.google.bookmark.dto;

/**
 * Partial-update payload for /api/me. Only fields the user can self-edit
 * appear here — googleSub, email, etc. stay sourced from the OIDC token.
 */
public record UpdateMeRequest(
    Boolean aiFeaturesEnabled
) {}
