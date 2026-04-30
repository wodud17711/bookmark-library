package com.google.bookmark.security;

import com.google.bookmark.domain.User;

/**
 * Common abstraction over OAuth2 and OIDC principal types so controllers
 * can depend on one shape regardless of the underlying provider flow.
 */
public interface UserPrincipal {

    User getUser();

    default Long getUserId() {
        return getUser().getId();
    }
}
