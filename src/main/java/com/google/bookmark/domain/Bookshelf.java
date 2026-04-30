package com.google.bookmark.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookshelves")
@Getter
@Setter
@NoArgsConstructor
public class Bookshelf {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "library_id", nullable = false)
    private Library library;

    @Column(nullable = false, length = 128)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private BookshelfZone zone = BookshelfZone.PUBLIC;

    @Column(nullable = false)
    private int position = 0;

    @Column(name = "max_books", nullable = false)
    private int maxBooks = 30;

    @Column(name = "wood_color", nullable = false, length = 16)
    private String woodColor = "#8B5A3C";

    @OneToMany(mappedBy = "bookshelf", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    private List<Book> books = new ArrayList<>();

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
