package com.google.bookmark.service;

import com.google.bookmark.domain.BookshelfThemeTier;
import com.google.bookmark.domain.FloorTheme;
import com.google.bookmark.dto.FloorThemeResponse;
import com.google.bookmark.repository.FloorThemeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FloorThemeService {

    public static final String DEFAULT_FLOOR_ID = "cream-pine";

    private final FloorThemeRepository floorThemeRepository;

    public List<FloorThemeResponse> findAll() {
        return floorThemeRepository.findAllByOrderBySortOrderAsc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public void seedDefaultsIfMissing() {
        upsert(creamPine());
        upsert(goldenOak());
        upsert(darkWenge());
    }

    /**
     * Seed-as-source-of-truth: insert if missing, otherwise update display
     * fields so renames/typo fixes in code propagate on next startup.
     * The id (referenced by Library.floorPaletteName) is never changed.
     */
    private void upsert(FloorTheme incoming) {
        FloorTheme existing = floorThemeRepository.findById(incoming.getId()).orElse(null);
        if (existing == null) {
            floorThemeRepository.save(incoming);
            return;
        }
        existing.setDisplayName(incoming.getDisplayName());
        existing.setDescription(incoming.getDescription());
        existing.setTier(incoming.getTier());
        existing.setPriceKrw(incoming.getPriceKrw());
        existing.setPrimaryColor(incoming.getPrimaryColor());
        existing.setShadowColor(incoming.getShadowColor());
        existing.setSortOrder(incoming.getSortOrder());
    }

    private FloorThemeResponse toResponse(FloorTheme t) {
        return new FloorThemeResponse(
            t.getId(),
            t.getDisplayName(),
            t.getDescription(),
            t.getTier().name(),
            t.getPriceKrw(),
            t.getPrimaryColor(),
            t.getShadowColor(),
            t.getSortOrder()
        );
    }

    private static FloorTheme creamPine() {
        FloorTheme t = new FloorTheme();
        t.setId(DEFAULT_FLOOR_ID);
        t.setDisplayName("크림 파인");
        t.setDescription("밝은 크림빛 메이플 마룻바닥. 햇빛 잘 드는 카페 느낌.");
        t.setTier(BookshelfThemeTier.FREE);
        t.setPrimaryColor("#E5D2B0");
        t.setShadowColor("#C9B088");
        t.setSortOrder(0);
        return t;
    }

    private static FloorTheme goldenOak() {
        FloorTheme t = new FloorTheme();
        t.setId("golden-oak");
        t.setDisplayName("골든 오크");
        t.setDescription("따뜻한 황금빛 오크. 클래식한 동네 도서관 느낌.");
        t.setTier(BookshelfThemeTier.FREE);
        t.setPrimaryColor("#B5824D");
        t.setShadowColor("#8B5A3C");
        t.setSortOrder(1);
        return t;
    }

    private static FloorTheme darkWenge() {
        FloorTheme t = new FloorTheme();
        t.setId("dark-wenge");
        t.setDisplayName("다크 웬지");
        t.setDescription("짙은 웬지 마루. 위스키 한 잔 같은 무드.");
        t.setTier(BookshelfThemeTier.FREE);
        t.setPrimaryColor("#3D2817");
        t.setShadowColor("#1F140A");
        t.setSortOrder(2);
        return t;
    }
}
