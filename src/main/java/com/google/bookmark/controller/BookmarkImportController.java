package com.google.bookmark.controller;

import com.google.bookmark.dto.ImportOutcome;
import com.google.bookmark.dto.ImportRequest;
import com.google.bookmark.dto.ImportSummary;
import com.google.bookmark.security.UserPrincipal;
import com.google.bookmark.service.BookAnnotationService;
import com.google.bookmark.service.BookmarkImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkImportController {

    private final BookmarkImportService importService;
    private final BookAnnotationService annotationService;

    @PostMapping("/import")
    public ImportSummary importBookmarks(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ImportRequest request
    ) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        ImportOutcome outcome = importService.importBookmarks(principal.getUserId(), request);
        // Hand the freshly-imported book IDs to the background annotator and
        // return immediately. The user sees the import summary right away;
        // titles/colors fill in over the next minutes as the queue drains.
        if (!outcome.bookIdsForAnnotation().isEmpty()) {
            annotationService.annotateBatchAsync(
                outcome.bookIdsForAnnotation(),
                principal.getUserId()
            );
        }
        return outcome.summary();
    }
}
