package com.google.bookmark.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

public record AiAnalysis(
    String smartTitle,
    List<String> tags,
    String summary
) {
    public static AiAnalysis empty() {
        return new AiAnalysis(null, List.of(), null);
    }

    // Jackson would otherwise serialize this as an `empty` property in JSON.
    // Internal helper for backend code paths — clients only need the named fields.
    @JsonIgnore
    public boolean isEmpty() {
        return (smartTitle == null || smartTitle.isBlank())
            && (tags == null || tags.isEmpty())
            && (summary == null || summary.isBlank());
    }
}
