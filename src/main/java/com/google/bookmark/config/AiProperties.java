package com.google.bookmark.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai")
public record AiProperties(
    boolean enabled,
    Gemini gemini,
    MetadataFetch metadataFetch
) {
    public record Gemini(
        String apiKey,
        String model,
        int perUserPerMinute,
        int timeoutSeconds
    ) {
        public boolean hasApiKey() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    public record MetadataFetch(
        int maxBytes,
        int timeoutSeconds
    ) {}

    public boolean isOperational() {
        return enabled && gemini != null && gemini.hasApiKey();
    }
}
