package com.google.bookmark.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "books")
@Getter
@Setter
@NoArgsConstructor
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bookshelf_id", nullable = false)
    private Bookshelf bookshelf;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(nullable = false, length = 256)
    private String title;

    @Column(name = "site_name", length = 128)
    private String siteName;

    @Column(name = "cover_color", nullable = false, length = 16)
    private String coverColor = "#3D2817";

    @Column(name = "title_color", nullable = false, length = 16)
    private String titleColor = "#F5F1EA";

    @Column(nullable = false)
    private int position = 0;

    @Column(name = "is_favorite", nullable = false)
    private boolean isFavorite = false;

    @Column(name = "favicon_url", length = 2048)
    private String faviconUrl;

    @Column(name = "og_image_url", length = 2048)
    private String ogImageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
