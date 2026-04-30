package com.google.bookmark.security;

import com.google.bookmark.domain.User;
import lombok.Getter;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

@Getter
public class CustomOidcUser extends DefaultOidcUser implements UserPrincipal {

    private final User user;

    public CustomOidcUser(User user, OidcUser base) {
        super(base.getAuthorities(), base.getIdToken(), base.getUserInfo(), "sub");
        this.user = user;
    }
}
