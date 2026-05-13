package com.google.bookmark.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    /** Maximum number of libraries one user can own. Hard cap, no plans yet. */
    public static final int MAX_LIBRARIES = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "google_sub", nullable = false, unique = true, length = 64)
    private String googleSub;

    @Column(nullable = false, length = 256)
    private String email;

    @Column(name = "display_name", nullable = false, length = 128)
    private String displayName;

    @Column(name = "picture_url", length = 1024)
    private String pictureUrl;

    @Column(nullable = false, unique = true, length = 64)
    private String username;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC, id ASC")
    private List<Library> libraries = new ArrayList<>();

    /**
     * Which library is currently active for the user. Null falls back to the
     * first library on access. Set when user creates or switches libraries.
     */
    @Column(name = "current_library_id")
    private Long currentLibraryId;

    /**
     * Per-user opt-out for AI-driven tagging/summary on new books. Default ON
     * because the feature is the headline value-add; users who don't want their
     * URLs/page excerpts sent to Gemini can flip this off in settings. Existing
     * books are not retro-affected when this changes — only future creations.
     */
    @Column(name = "ai_features_enabled", nullable = false)
    private boolean aiFeaturesEnabled = true;

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

    public void addLibrary(Library lib) {
        lib.setUser(this);
        this.libraries.add(lib);
    }
}
