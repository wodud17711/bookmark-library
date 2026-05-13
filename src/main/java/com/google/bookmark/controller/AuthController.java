package com.google.bookmark.controller;

import com.google.bookmark.domain.User;
import com.google.bookmark.dto.MeResponse;
import com.google.bookmark.dto.UpdateMeRequest;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return toResponse(principal.getUser());
    }

    @PatchMapping("/me")
    public MeResponse updateMe(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestBody UpdateMeRequest request
    ) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        User updated = userService.updateSettings(principal.getUserId(), request);
        return toResponse(updated);
    }

    private MeResponse toResponse(User user) {
        return new MeResponse(
            user.getId(),
            user.getEmail(),
            user.getDisplayName(),
            user.getUsername(),
            user.getPictureUrl(),
            user.isAiFeaturesEnabled()
        );
    }
}
