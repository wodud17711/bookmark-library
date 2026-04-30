package com.google.bookmark.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A bookmark imported but not yet shelved. Lives in the user's storage
 * area (the back room / 창고). One-to-many on User; library-agnostic so it
 * survives multi-library expansion in v2.
 *
 * StoredBook intentionally lacks the visual/customization fields of Book —
 * those are assigned when the user moves it onto a real shelf.
 */
@Entity
@Table(
    name = "stored_books",
    indexes = @Index(name = "idx_stored_books_user", columnList = "user_id")
)
@Getter
@Setter
@NoArgsConstructor
public class StoredBook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(nullable = false, length = 256)
    private String title;

    @Column(name = "site_name", length = 128)
    private String siteName;

    /** Original folder path from the import source, e.g. "자료 / 프론트엔드". Used as a hint when shelving. */
    @Column(name = "original_folder", length = 512)
    private String originalFolder;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    @PrePersist
    void onCreate() {
        this.addedAt = Instant.now();
    }
}
