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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "libraries",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_libraries_user_slug",
        columnNames = { "user_id", "slug" }
    ),
    indexes = @Index(name = "idx_libraries_user", columnList = "user_id")
)
@Getter
@Setter
@NoArgsConstructor
public class Library {

    /** Per-library bookshelf cap. Floor plan looks cleanest at 8 (4 per wall). */
    public static final int MAX_BOOKSHELVES = 8;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * URL-safe identifier, unique per user. Used in public share URLs:
     * {@code /u/{username}/{slug}}.
     */
    @Column(nullable = false, length = 64)
    private String slug = "main";

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic = false;

    @Column(name = "palette_name", nullable = false, length = 64)
    private String paletteName = "warm-walnut";

    /**
     * Floor palette id. Nullable for backwards compatibility with rows that
     * existed before this column was added; service treats null as default.
     */
    @Column(name = "floor_palette_name", length = 64)
    private String floorPaletteName = "cream-pine";

    /** Free-form welcome message shown at the entrance. Visible to public visitors. */
    @Lob
    @Column(name = "welcome_message", columnDefinition = "TEXT")
    private String welcomeMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "entrance_mood", nullable = false, length = 16)
    private EntranceMood entranceMood = EntranceMood.DAY;

    /**
     * Pre-rendered Open Graph image bytes (PNG). The frontend snapshots its own
     * Pixi floor plan after draw completes and uploads it here, so social link
     * previews can show the actual library without a headless renderer on the
     * server. Nullable until the owner has visited their library on desktop.
     */
    @Lob
    @Column(name = "og_image")
    private byte[] ogImage;

    @Column(name = "og_image_updated_at")
    private Instant ogImageUpdatedAt;

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
