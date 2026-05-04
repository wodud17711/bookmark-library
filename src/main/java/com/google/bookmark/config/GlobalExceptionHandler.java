package com.google.bookmark.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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
@Slf4j
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

    /**
     * Spring throws these when no controller / static resource matches the
     * request URI. Without a specific handler the catch-all below would turn
     * a perfectly normal "page not found" into a 500. Return a clean 404 JSON.
     */
    @ExceptionHandler({ NoHandlerFoundException.class, NoResourceFoundException.class })
    public ResponseEntity<Map<String, Object>> handleNotFound(Exception ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.NOT_FOUND.value());
        body.put("error", HttpStatus.NOT_FOUND.getReasonPhrase());
        body.put("message", "요청하신 경로를 찾을 수 없습니다.");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    /**
     * Catch-all for exceptions we didn't model with ResponseStatusException
     * (NPE, DataIntegrityViolation, IllegalArgument, etc.). Logs the full
     * stack trace server-side for debugging, but returns a generic Korean
     * message to the client so internal details (table names, file paths,
     * library code) never leak through error bodies.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception in request", ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());
        body.put("message", "서버에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
