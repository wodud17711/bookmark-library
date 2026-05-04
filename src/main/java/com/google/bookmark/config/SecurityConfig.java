package com.google.bookmark.config;

import com.google.bookmark.security.CustomOAuth2UserService;
import com.google.bookmark.security.CustomOidcUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomOidcUserService customOidcUserService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
            .authorizeHttpRequests(auth -> auth
                // ─── Public API endpoints ─────────────────────────────
                // Public share JSON — viewable without sign-in
                .requestMatchers("/api/u/**").permitAll()
                // Anonymous report submissions — anyone with a share URL can flag content
                .requestMatchers(HttpMethod.POST, "/api/reports").permitAll()
                // ─── Strict on the rest of /api/** ────────────────────
                // The actual sensitive surface — owner data, mutations, exports.
                // 401 JSON via the entry point below for unauthenticated callers.
                .requestMatchers("/api/**").authenticated()

                // ─── Public non-API paths ─────────────────────────────
                // Public OG image bytes — fetched by social-media crawlers
                .requestMatchers("/og/**").permitAll()
                // Public-share HTML (server-rendered with OG meta tags)
                .requestMatchers("/u/**").permitAll()
                // Everything else (OAuth flow, /login, /logout, /error, static
                // assets, SPA fallthroughs) is left open — those carry no
                // sensitive data and Spring Security's own machinery needs them
                // reachable. Sensitive logic is gated through /api/** above.
                .anyRequest().permitAll()
            )
            .oauth2Login(oauth -> oauth
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                    .oidcUserService(customOidcUserService)
                )
                .successHandler((request, response, authentication) ->
                    response.sendRedirect(frontendUrl + "/")
                )
            )
            .logout(logout -> logout
                .logoutSuccessUrl(frontendUrl + "/login")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            )
            .exceptionHandling(ex -> ex
                .defaultAuthenticationEntryPointFor(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                    request -> request.getRequestURI().startsWith("/api/")
                )
            );
        return http.build();
    }
}
