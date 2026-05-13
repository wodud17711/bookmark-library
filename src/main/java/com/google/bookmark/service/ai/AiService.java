package com.google.bookmark.service.ai;

import com.google.bookmark.dto.AiAnalysis;
import com.google.bookmark.dto.WebPageContent;

/**
 * Abstraction over the LLM provider. Implementations call out to a hosted model
 * (Gemini today, Groq/Claude tomorrow) — callers only see the analysis shape.
 *
 * Implementations MUST be resilient: never let a transient model failure block
 * book creation. Return {@link AiAnalysis#empty()} on any failure path.
 */
public interface AiService {

    /**
     * Generate tags + a 1-2 sentence Korean summary for the given page content.
     * Returns an empty analysis if AI is disabled, the user is over their rate
     * limit, or the upstream call fails. Callers should treat any field as
     * optional and never assume both are populated.
     */
    AiAnalysis analyze(WebPageContent content, Long userId);
}
