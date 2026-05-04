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
                // ─── Explicitly public ────────────────────────────────
                // Public share JSON endpoints — viewable without sign-in
                .requestMatchers("/api/u/**").permitAll()
                // Public OG image bytes — fetched by social-media crawlers
                .requestMatchers("/og/**").permitAll()
                // Public-share HTML (server-rendered with OG meta tags)
                .requestMatchers("/u/**").permitAll()
                // Anonymous report submissions — anyone with a share URL can flag content
                .requestMatchers(HttpMethod.POST, "/api/reports").permitAll()
                // OAuth2 flow paths — entry points and callback handlers
                .requestMatchers("/oauth2/**", "/login/oauth2/**", "/login").permitAll()
                // Logout endpoint — public so users can sign out cleanly
                .requestMatchers("/logout").permitAll()
                // Static resources / favicon / common public assets
                .requestMatchers("/", "/favicon.svg", "/error").permitAll()

                // ─── All authenticated API ────────────────────────────
                .requestMatchers("/api/**").authenticated()

                // ─── Deny by default ──────────────────────────────────
                // Anything not explicitly permitted above requires auth.
                // Adding a new endpoint won't accidentally make it public.
                .anyRequest().authenticated()
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
