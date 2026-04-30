package com.google.bookmark.controller;

import com.google.bookmark.domain.User;
import com.google.bookmark.dto.MeResponse;
import com.google.bookmark.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AuthController {

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        User user = principal.getUser();
        return new MeResponse(
            user.getId(),
            user.getEmail(),
            user.getDisplayName(),
            user.getUsername(),
            user.getPictureUrl()
        );
    }
}
