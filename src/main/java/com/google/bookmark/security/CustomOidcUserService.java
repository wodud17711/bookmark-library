package com.google.bookmark.security;

import com.google.bookmark.domain.User;
import com.google.bookmark.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final UserService userService;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);

        User user = userService.findOrCreate(
            oidcUser.getSubject(),
            oidcUser.getEmail(),
            oidcUser.getFullName(),
            oidcUser.getPicture()
        );

        return new CustomOidcUser(user, oidcUser);
    }
}
