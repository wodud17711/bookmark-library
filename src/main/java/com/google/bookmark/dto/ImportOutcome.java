package com.google.bookmark.dto;

import java.util.List;

/**
 * Internal wrapper returned by BookmarkImportService — pairs the user-facing
 * {@link ImportSummary} with the list of newly-created book IDs that should
 * receive AI annotation in the background. Controller hands the IDs to
 * BookAnnotationService and only the summary back to the client.
 */
public record ImportOutcome(
    ImportSummary summary,
    List<Long> bookIdsForAnnotation
) {
    public static ImportOutcome of(ImportSummary summary) {
        return new ImportOutcome(summary, List.of());
    }
}
