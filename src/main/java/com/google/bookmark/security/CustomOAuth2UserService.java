package com.google.bookmark.security;

import com.google.bookmark.domain.User;
import com.google.bookmark.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserService userService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        User user = userService.findOrCreate(
            oauth2User.getAttribute("sub"),
            oauth2User.getAttribute("email"),
            oauth2User.getAttribute("name"),
            oauth2User.getAttribute("picture")
        );

        return new CustomOAuth2User(user, oauth2User);
    }
}
