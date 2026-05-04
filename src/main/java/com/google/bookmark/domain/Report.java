package com.google.bookmark.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * User-submitted report against a public library. Anyone with the share URL
 * can file one (anonymous OR authenticated); the operator triages the rows
 * and decides whether to force-private or delete the offending library.
 *
 * <p>Stored as plain ID references rather than JPA relations so a deleted
 * library doesn't cascade away its incident history.
 */
@Entity
@Table(
    name = "reports",
    indexes = {
        @Index(name = "idx_reports_library", columnList = "library_id"),
        @Index(name = "idx_reports_status_created", columnList = "status, created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "library_id", nullable = false)
    private Long libraryId;

    /** Null when reporter wasn't logged in. */
    @Column(name = "reporter_user_id")
    private Long reporterUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ReportReason reason;

    /** Optional free-text context from the reporter. Capped at 1000 chars.
     *  {@code LONGVARCHAR} avoids PG OID mapping just like Library.welcomeMessage. */
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(columnDefinition = "TEXT")
    private String details;

    /** PENDING → REVIEWED → ACTIONED. Operator moves it forward as they triage. */
    @Column(nullable = false, length = 16)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
