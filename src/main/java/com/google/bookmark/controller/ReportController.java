package com.google.bookmark.controller;

import com.google.bookmark.dto.ReportRequest;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Anonymous-friendly report submission endpoint. Anyone with a public-share
 * URL can flag the library; operator triages downstream from
 * {@link com.google.bookmark.domain.Report} rows.
 *
 * <p>Auth is OPTIONAL — if signed in, the reporter id is stored alongside the
 * report so repeat false-flag accounts can be deprioritised later.
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void submitReport(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ReportRequest request
    ) {
        Long reporterUserId = principal != null ? principal.getUserId() : null;
        reportService.submitReport(
            request.libraryId(),
            reporterUserId,
            request.reason(),
            request.details()
        );
    }
}
