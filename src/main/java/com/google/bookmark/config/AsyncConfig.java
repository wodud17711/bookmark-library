package com.google.bookmark.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Background-task wiring. Currently only one executor lives here: the
 * single-thread "aiAnnotator" used to drain Chrome-import AI annotation
 * requests one book at a time, app-wide.
 *
 * Why single-thread:
 *   - Combined with the 7-second per-book sleep in BookAnnotationService,
 *     this caps global Gemini calls at ~8.5/min — comfortably under
 *     Flash-Lite's 10 RPM ceiling and burst-safe for the 500 RPD daily cap.
 *   - Concurrent imports queue naturally; one user's 100-book import doesn't
 *     drown out another user's just-uploaded 5 books because the queue is
 *     FIFO. Trade-off accepted: later-queued books wait longer.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "aiAnnotator")
    public Executor aiAnnotatorExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(1);
        exec.setMaxPoolSize(1);
        // 500 = one full day's worth of RPD at our pacing. If we ever overflow
        // this in practice, that's a signal to revisit the per-import cap.
        exec.setQueueCapacity(500);
        exec.setThreadNamePrefix("ai-annotator-");
        // App restart drops queued tasks — acceptable, books still keep their
        // import-time titles. Restart-resilient queue would need Redis/DB
        // (out of scope for v1).
        exec.setWaitForTasksToCompleteOnShutdown(false);
        exec.initialize();
        return exec;
    }
}
