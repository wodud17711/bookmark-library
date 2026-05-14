package com.google.bookmark.service;

import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.User;
import com.google.bookmark.dto.AiAnalysis;
import com.google.bookmark.dto.WebPageContent;
import com.google.bookmark.repository.BookRepository;
import com.google.bookmark.repository.UserRepository;
import com.google.bookmark.service.ai.AiService;
import com.google.bookmark.service.ai.WebMetadataFetcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Background AI annotation for Chrome-imported books. Runs on the
 * single-thread "aiAnnotator" executor (see {@link com.google.bookmark.config.AsyncConfig})
 * so the global Gemini RPM stays well under the free-tier 10 RPM cap.
 *
 * Failure model: per-book failures (timeout, parse error, fetch failure)
 * are swallowed so one bad URL doesn't kill the whole batch. The book just
 * keeps its import-time title.
 *
 * Why bypass the per-user rate limiter: this thread is already paced at 7s
 * per book (8.5/min, under cap). Sharing the user's interactive limiter
 * would mean a long-running import drains their interactive add-book budget.
 * The 7s pacing is the throttle here.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookAnnotationService {

    private static final long PACING_MILLIS = 7_000L;

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final WebMetadataFetcher metadataFetcher;

    // Self-injection so {@link #annotateOne}'s @Transactional proxy fires
    // when called from {@link #annotateBatchAsync}. A direct this.annotateOne()
    // would bypass the proxy and run without a transaction.
    @Lazy
    @Autowired
    private BookAnnotationService self;

    /**
     * Fire-and-forget batch annotation. Each book runs in its own short
     * transaction so a mid-batch failure doesn't roll back already-annotated
     * books. The 7-second pace before each call (skipped on the last) keeps
     * us under Gemini's RPM ceiling without needing the user-RPM limiter.
     */
    @Async("aiAnnotator")
    public void annotateBatchAsync(List<Long> bookIds, Long userId) {
        if (bookIds == null || bookIds.isEmpty()) return;

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty() || !userOpt.get().isAiFeaturesEnabled()) {
            log.info("[AI annotate] user {} unavailable or opted out — skipping batch of {}",
                userId, bookIds.size());
            return;
        }

        log.info("[AI annotate] starting batch of {} books for user {}", bookIds.size(), userId);
        int annotated = 0;
        for (int i = 0; i < bookIds.size(); i++) {
            Long bookId = bookIds.get(i);
            try {
                if (self.annotateOne(bookId, userId)) annotated++;
            } catch (Exception e) {
                log.warn("[AI annotate] book {} failed: {}", bookId, e.getMessage());
            }

            // Skip sleep on the last book to shave 7s off batch wall time.
            if (i < bookIds.size() - 1) {
                try {
                    Thread.sleep(PACING_MILLIS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    log.info("[AI annotate] interrupted at {}/{}", i + 1, bookIds.size());
                    return;
                }
            }
        }
        log.info("[AI annotate] batch complete for user {} — {}/{} annotated",
            userId, annotated, bookIds.size());
    }

    /**
     * Single-book annotation in its own transaction. Re-loads the book from
     * DB so a stale snapshot from the import isn't used (book may have been
     * deleted/moved before the queue caught up). Returns true if AI returned
     * something usable.
     */
    @Transactional
    public boolean annotateOne(Long bookId, Long ownerId) {
        Book book = bookRepository.findById(bookId).orElse(null);
        if (book == null) return false;
        // Defensive ownership check — book could have been moved or deleted.
        if (!book.getBookshelf().getLibrary().getUser().getId().equals(ownerId)) {
            return false;
        }

        Optional<WebPageContent> metadataOpt = metadataFetcher.fetch(book.getUrl());
        WebPageContent content = metadataOpt
            .orElse(new WebPageContent(book.getUrl(), null, book.getSiteName(), null, null));

        AiAnalysis analysis = aiService.analyzeUnthrottled(content, ownerId);
        if (analysis.isEmpty()) return false;

        String smart = analysis.smartTitle();
        if (smart != null && !smart.isBlank()) {
            String trimmed = smart.trim();
            book.setTitle(trimmed.length() > 256 ? trimmed.substring(0, 256) : trimmed);
        }
        String coverColor = analysis.coverColor();
        if (coverColor != null) {
            book.setCoverColor(coverColor);
        }
        if (analysis.tags() != null && !analysis.tags().isEmpty()) {
            book.setTags(new ArrayList<>(analysis.tags()));
        }
        if (analysis.summary() != null && !analysis.summary().isBlank()) {
            String summary = analysis.summary();
            book.setAiSummary(summary.length() > 512 ? summary.substring(0, 512) : summary);
        }
        return true;
    }
}
