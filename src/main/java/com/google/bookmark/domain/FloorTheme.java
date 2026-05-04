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

/**
 * Color palette for the library's floor (the entire room background in
 * the top-down floor plan). Independent from {@link BookshelfTheme} so
 * users can mix and match.
 */
@Entity
@Table(name = "floor_themes")
@Getter
@Setter
@NoArgsConstructor
public class FloorTheme {

    /** Stable string key, e.g. "cream-pine". Referenced by Library.floorPaletteName. */
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

    /** Main wood color of the planks. */
    @Column(name = "primary_color", nullable = false, length = 16)
    private String primaryColor;

    /** Plank seam / shadow color. */
    @Column(name = "shadow_color", nullable = false, length = 16)
    private String shadowColor;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;
}
