package com.google.bookmark.controller;

import com.google.bookmark.dto.AiAnalysis;
import com.google.bookmark.dto.WebPageContent;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.ai.AiService;
import com.google.bookmark.service.ai.WebMetadataFetcher;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * PR1 smoke-test surface. Lets a signed-in user trigger the full pipeline
 * (fetch metadata → call Gemini → parse) without book persistence so we can
 * verify wiring end-to-end before PR2 hooks it into BookService.
 *
 * Slated for removal once {@link com.google.bookmark.service.BookService}
 * calls AiService directly — or kept as a "re-analyze this book" admin tool.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final WebMetadataFetcher metadataFetcher;

    public record AnalyzeRequest(@NotBlank String url) {}

    @PostMapping("/analyze")
    public AiAnalysis analyze(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestBody AnalyzeRequest request
    ) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        if (request == null || request.url() == null || request.url().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL이 비어있습니다.");
        }
        WebPageContent content = metadataFetcher.fetch(request.url())
            .orElse(new WebPageContent(request.url(), null, null, null));
        return aiService.analyze(content, principal.getUserId());
    }
}
