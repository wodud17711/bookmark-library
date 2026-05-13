package com.google.bookmark.service.ai;

import com.google.bookmark.config.AiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window rate limit keyed on user id. Lives in-memory because we run a
 * single backend instance and want zero infra weight; if we ever scale out, this
 * becomes a Redis sorted-set with the same shape.
 *
 * The guard exists to keep a single user's Chrome import (100+ books burst)
 * from draining the daily Gemini quota that every other user shares.
 */
@Component
@RequiredArgsConstructor
public class AiRateLimiter {

    private final AiProperties props;
    private final Map<Long, Deque<Long>> userWindows = new ConcurrentHashMap<>();

    /** True if this call fits within the per-user-per-minute budget. */
    public boolean tryAcquire(Long userId) {
        if (userId == null) return false;
        int limit = props.gemini().perUserPerMinute();
        long now = System.currentTimeMillis();
        long cutoff = now - 60_000L;

        Deque<Long> window = userWindows.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && window.peekFirst() < cutoff) {
                window.pollFirst();
            }
            if (window.size() >= limit) {
                return false;
            }
            window.offerLast(now);
            return true;
        }
    }
}
