package com.google.bookmark.service.ai;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import com.google.bookmark.config.AiProperties;
import com.google.bookmark.dto.AiAnalysis;
import com.google.bookmark.dto.WebPageContent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Calls Gemini's generateContent endpoint with a structured-output schema so
 * we get back a clean {tags, summary} JSON instead of having to parse free
 * text. The wire-format quirks (camelCase mimeType vs SCREAMING enum types)
 * are an artifact of Google's REST API — don't reorder/rename casually.
 *
 * Every failure path (disabled config, missing key, rate limit, network, bad
 * JSON, blocked-by-safety-filter) returns {@link AiAnalysis#empty()}.
 */
@Service
@Slf4j
public class GeminiAiService implements AiService {

    private static final String ENDPOINT_TEMPLATE =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final AiProperties props;
    private final AiRateLimiter rateLimiter;
    private final HttpClient http;
    private final ObjectMapper mapper = JsonMapper.builder().build();

    public GeminiAiService(AiProperties props, AiRateLimiter rateLimiter) {
        this.props = props;
        this.rateLimiter = rateLimiter;
        this.http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    @Override
    public AiAnalysis analyze(WebPageContent content, Long userId) {
        if (!props.isOperational()) {
            return AiAnalysis.empty();
        }
        if (content == null) {
            return AiAnalysis.empty();
        }
        if (!rateLimiter.tryAcquire(userId)) {
            log.info("AI analyze rate-limited for user {}", userId);
            return AiAnalysis.empty();
        }

        try {
            String requestBody = buildRequestBody(content);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(String.format(
                    ENDPOINT_TEMPLATE,
                    props.gemini().model(),
                    props.gemini().apiKey()
                )))
                .timeout(Duration.ofSeconds(props.gemini().timeoutSeconds()))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                // Body may contain quota/auth detail — log the status separately
                // so we can grep without leaking the full payload at INFO.
                log.warn("Gemini returned HTTP {}: {}", response.statusCode(),
                    truncate(response.body(), 500));
                return AiAnalysis.empty();
            }
            return parseAnalysis(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return AiAnalysis.empty();
        } catch (Exception e) {
            log.warn("Gemini call failed for url={}: {}", content.url(), e.getMessage());
            return AiAnalysis.empty();
        }
    }

    private String buildRequestBody(WebPageContent content) throws Exception {
        // Schema-constrained JSON output keeps us out of "did the model wrap
        // it in ```json``` again?" territory. Gemini honors responseSchema
        // strictly when responseMimeType is application/json.
        ObjectNode root = mapper.createObjectNode();

        ObjectNode systemInstruction = root.putObject("systemInstruction");
        ArrayNode sysParts = systemInstruction.putArray("parts");
        sysParts.addObject().put("text", systemPrompt());

        ArrayNode contents = root.putArray("contents");
        ObjectNode userTurn = contents.addObject();
        userTurn.put("role", "user");
        ArrayNode userParts = userTurn.putArray("parts");
        userParts.addObject().put("text", userPrompt(content));

        ObjectNode genConfig = root.putObject("generationConfig");
        genConfig.put("temperature", 0.2);
        genConfig.put("maxOutputTokens", 300);
        genConfig.put("responseMimeType", "application/json");

        ObjectNode schema = genConfig.putObject("responseSchema");
        schema.put("type", "OBJECT");
        ObjectNode properties = schema.putObject("properties");
        properties.putObject("smartTitle").put("type", "STRING");
        ObjectNode tagsProp = properties.putObject("tags");
        tagsProp.put("type", "ARRAY");
        tagsProp.putObject("items").put("type", "STRING");
        tagsProp.put("minItems", 1);
        tagsProp.put("maxItems", 4);
        properties.putObject("summary").put("type", "STRING");
        // smartTitle is the load-bearing field for book.title now; tags/summary
        // are kept for future search/filter (not currently shown in the UI).
        schema.putArray("required").add("smartTitle").add("tags").add("summary");

        return mapper.writeValueAsString(root);
    }

    private String systemPrompt() {
        return """
            너는 북마크 도서관 서비스의 큐레이터다. 사용자가 저장한 웹 페이지의 \
            메타데이터를 받아 책장에 꽂힐 "책 제목"을 만든다. 동시에 검색용 태그와 \
            한 줄 요약도 함께 만든다.

            가장 중요: smartTitle 규칙
            - 길이는 60자 이내. 책장 한 줄에 들어갈 짧은 제목.
            - 페이지가 잘 알려진 서비스/사이트 홈이면 서비스 이름만 써라. \
              예: "Google", "네이버", "GitHub", "Notion".
            - 페이지가 게시판/블로그/뉴스 글이면 "사이트명 - 글 내용 한 줄 요약" \
              형식으로 만들어라. 예: "벨로그 - React 19 컴파일러 정리", \
              "NamuWiki - 조선왕조 계보", "DC인사이드 - 자취 식단 추천글".
            - 사이트명을 모르면 도메인 호스트(예: "semcalc.com")를 사용해도 된다.
            - 따옴표, 이모지, 말줄임표 금지. 한국어와 영어/숫자만 사용.

            태그/요약 규칙 (검색용 — UI에는 노출 안 됨)
            - 태그는 2~4개. 한국어 명사 또는 짧은 명사구. 영어 고유명사 OK.
            - 요약은 1~2문장, 100자 이내, 한국어. "이 페이지는", "이 글은" 같은 \
              군더더기 금지.

            공통: 페이지 내용에 없는 정보를 추측하지 말 것. 정보가 부족하면 \
            제목/사이트명/도메인만으로 일반화한다.
            """;
    }

    private String userPrompt(WebPageContent content) {
        StringBuilder sb = new StringBuilder();
        sb.append("URL: ").append(content.url()).append('\n');
        if (content.title() != null) sb.append("제목: ").append(content.title()).append('\n');
        if (content.siteName() != null) sb.append("사이트: ").append(content.siteName()).append('\n');
        if (content.excerpt() != null && !content.excerpt().isBlank()) {
            sb.append("본문 일부:\n").append(content.excerpt());
        }
        return sb.toString();
    }

    private AiAnalysis parseAnalysis(String responseBody) {
        try {
            JsonNode root = mapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                return AiAnalysis.empty();
            }
            // finishReason == SAFETY/RECITATION → no parts, treat as empty.
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                return AiAnalysis.empty();
            }
            String jsonText = parts.get(0).path("text").asString("");
            if (jsonText.isBlank()) return AiAnalysis.empty();

            JsonNode payload = mapper.readTree(jsonText);
            String smartTitle = payload.path("smartTitle").asString("").trim();
            List<String> tags = new ArrayList<>();
            JsonNode tagsNode = payload.path("tags");
            if (tagsNode.isArray()) {
                tagsNode.forEach(node -> {
                    String tag = node.asString("").trim();
                    if (!tag.isBlank() && tags.size() < 4) tags.add(tag);
                });
            }
            String summary = payload.path("summary").asString("").trim();
            return new AiAnalysis(
                smartTitle.isBlank() ? null : smartTitle,
                tags,
                summary.isBlank() ? null : summary
            );
        } catch (Exception e) {
            log.warn("Failed to parse Gemini response: {}", e.getMessage());
            return AiAnalysis.empty();
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
