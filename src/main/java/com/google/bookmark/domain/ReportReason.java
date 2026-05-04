package com.google.bookmark.domain;

/**
 * Categories a public-library visitor can pick when filing a report.
 * Drives the operator's first-pass triage in the DB.
 */
public enum ReportReason {
    /** Illegal content — sexual, gambling, drugs, weapons, etc. */
    ILLEGAL,
    /** Copyright or trademark infringement (linked content or library naming). */
    COPYRIGHT,
    /** Defamation, doxxing, harassment, or other rights violations. */
    HARASSMENT,
    /** Spam, fake/malicious URLs, phishing. */
    SPAM,
    /** Anything else that doesn't fit the buckets above. */
    OTHER
}
