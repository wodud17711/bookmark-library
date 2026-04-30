package com.google.bookmark.security;

import com.google.bookmark.domain.User;
import lombok.Getter;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

@Getter
public class CustomOAuth2User extends DefaultOAuth2User implements UserPrincipal {

    private final User user;

    public CustomOAuth2User(User user, OAuth2User base) {
        super(base.getAuthorities(), base.getAttributes(), "sub");
        this.user = user;
    }
}
