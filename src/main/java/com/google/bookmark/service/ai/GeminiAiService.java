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
        ObjectNode tagsProp = properties.putObject("tags");
        tagsProp.put("type", "ARRAY");
        tagsProp.putObject("items").put("type", "STRING");
        tagsProp.put("minItems", 1);
        tagsProp.put("maxItems", 4);
        properties.putObject("summary").put("type", "STRING");
        schema.putArray("required").add("tags").add("summary");

        return mapper.writeValueAsString(root);
    }

    private String systemPrompt() {
        return """
            너는 북마크 도서관 서비스의 큐레이터다. 사용자가 저장한 웹 페이지의 \
            메타데이터를 받아 한국어 태그와 짧은 요약을 만든다.

            규칙:
            - 태그는 2~4개. 한국어 명사 또는 짧은 명사구 (예: "개발", "AI 도구", "디자인 영감"). \
              영어 고유명사는 그대로 사용 가능 (예: "React").
            - 요약은 1~2문장, 100자 이내, 한국어. 페이지가 무엇을 다루는지 한눈에 알 수 있게.
            - 페이지 내용에 없는 정보를 추측하지 말 것. 정보가 부족하면 제목/사이트명만으로 일반화.
            - 광고성 문구, 이모지, "이 페이지는", "이 글은" 같은 군더더기 표현 금지.
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
            List<String> tags = new ArrayList<>();
            JsonNode tagsNode = payload.path("tags");
            if (tagsNode.isArray()) {
                tagsNode.forEach(node -> {
                    String tag = node.asString("").trim();
                    if (!tag.isBlank() && tags.size() < 4) tags.add(tag);
                });
            }
            String summary = payload.path("summary").asString("").trim();
            return new AiAnalysis(tags, summary.isBlank() ? null : summary);
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
