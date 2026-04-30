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
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
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
@Table(name = "libraries")
@Getter
@Setter
@NoArgsConstructor
public class Library {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic = false;

    @Column(name = "palette_name", nullable = false, length = 64)
    private String paletteName = "warm-walnut";

    /** Free-form welcome message shown at the entrance. Visible to public visitors. */
    @Lob
    @Column(name = "welcome_message", columnDefinition = "TEXT")
    private String welcomeMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "entrance_mood", nullable = false, length = 16)
    private EntranceMood entranceMood = EntranceMood.DAY;

    @OneToMany(mappedBy = "library", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    private List<Bookshelf> bookshelves = new ArrayList<>();

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

    public void addBookshelf(Bookshelf shelf) {
        shelf.setLibrary(this);
        this.bookshelves.add(shelf);
    }
}
