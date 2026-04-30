package com.google.bookmark.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bookshelf_themes")
@Getter
@Setter
@NoArgsConstructor
public class BookshelfTheme {

    /** Stable string key, e.g. "warm-walnut". Referenced by Library.paletteName. */
    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "display_name", nullable = false, length = 64)
    private String displayName;

    @Column(length = 256)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private BookshelfThemeTier tier = BookshelfThemeTier.FREE;

    /** KRW. Null for free tier. */
    @Column(name = "price_krw")
    private Integer priceKrw;

    @Column(name = "wood_color", nullable = false, length = 16)
    private String woodColor;

    @Column(name = "shadow_color", nullable = false, length = 16)
    private String shadowColor;

    @Column(name = "wall_color", nullable = false, length = 16)
    private String wallColor;

    /** Optional accent (e.g. industrial frame metal). */
    @Column(name = "frame_color", length = 16)
    private String frameColor;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;
}
