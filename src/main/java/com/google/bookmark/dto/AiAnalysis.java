package com.google.bookmark.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

public record AiAnalysis(
    List<String> tags,
    String summary
) {
    public static AiAnalysis empty() {
        return new AiAnalysis(List.of(), null);
    }

    // Jackson would otherwise serialize this as an `empty` property in JSON.
    // Internal helper for backend code paths — clients only need tags/summary.
    @JsonIgnore
    public boolean isEmpty() {
        return (tags == null || tags.isEmpty()) && (summary == null || summary.isBlank());
    }
}
