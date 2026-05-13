package com.google.bookmark.dto;

import java.util.List;

public record AiAnalysis(
    List<String> tags,
    String summary
) {
    public static AiAnalysis empty() {
        return new AiAnalysis(List.of(), null);
    }

    public boolean isEmpty() {
        return (tags == null || tags.isEmpty()) && (summary == null || summary.isBlank());
    }
}
