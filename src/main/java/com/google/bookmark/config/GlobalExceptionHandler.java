package com.google.bookmark.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Convert ResponseStatusException to a consistent JSON body so the frontend
 * can always extract a meaningful {@code message} field, regardless of
 * Spring Boot's `server.error.include-message` configuration.
 *
 * Body shape:
 * <pre>
 * {
 *   "status": 409,
 *   "error": "Conflict",
 *   "message": "선택한 책장이 가득 찼습니다.",
 *   "timestamp": "2026-04-30T15:00:00Z"
 * }
 * </pre>
 *
 * Our backend only throws ResponseStatusException with deliberate, user-facing
 * Korean messages, so exposing them is safe.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        HttpStatusCode statusCode = ex.getStatusCode();
        String reason = ex.getReason();
        String fallbackPhrase = HttpStatus.valueOf(statusCode.value()).getReasonPhrase();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", statusCode.value());
        body.put("error", fallbackPhrase);
        body.put("message", (reason == null || reason.isBlank()) ? fallbackPhrase : reason);
        return ResponseEntity.status(statusCode).body(body);
    }
}
