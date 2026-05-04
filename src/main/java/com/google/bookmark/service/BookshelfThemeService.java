package com.google.bookmark.service;

import com.google.bookmark.domain.BookshelfTheme;
import com.google.bookmark.domain.BookshelfThemeTier;
import com.google.bookmark.dto.ThemeResponse;
import com.google.bookmark.repository.BookshelfThemeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookshelfThemeService {

    public static final String DEFAULT_THEME_ID = "warm-walnut";

    private final BookshelfThemeRepository themeRepository;

    public List<ThemeResponse> findAll() {
        return themeRepository.findAllByOrderBySortOrderAsc().stream()
            .map(this::toResponse)
            .toList();
    }

    private ThemeResponse toResponse(BookshelfTheme t) {
        return new ThemeResponse(
            t.getId(),
            t.getDisplayName(),
            t.getDescription(),
            t.getTier().name(),
            t.getPriceKrw(),
            t.getWoodColor(),
            t.getShadowColor(),
            t.getWallColor(),
            t.getFrameColor(),
            t.getSortOrder()
        );
    }

    @Transactional
    public void seedDefaultsIfMissing() {
        upsert(walnut());
        upsert(pine());
        upsert(industrial());
    }

    /**
     * Seed-as-source-of-truth: insert if missing, otherwise sync display
     * fields so changes in code propagate on next startup. The id
     * (referenced by Library.paletteName) is never changed.
     */
    private void upsert(BookshelfTheme incoming) {
        BookshelfTheme existing = themeRepository.findById(incoming.getId()).orElse(null);
        if (existing == null) {
            themeRepository.save(incoming);
            return;
        }
        existing.setDisplayName(incoming.getDisplayName());
        existing.setDescription(incoming.getDescription());
        existing.setTier(incoming.getTier());
        existing.setPriceKrw(incoming.getPriceKrw());
        existing.setWoodColor(incoming.getWoodColor());
        existing.setShadowColor(incoming.getShadowColor());
        existing.setWallColor(incoming.getWallColor());
        existing.setFrameColor(incoming.getFrameColor());
        existing.setSortOrder(incoming.getSortOrder());
    }

    private static BookshelfTheme walnut() {
        BookshelfTheme t = new BookshelfTheme();
        t.setId(DEFAULT_THEME_ID);
        t.setDisplayName("월넛");
        t.setDescription("짙은 호두나무. 클래식한 서재.");
        t.setTier(BookshelfThemeTier.FREE);
        t.setWoodColor("#5C3A2A");
        t.setShadowColor("#2E1D14");
        t.setWallColor("#1F1816");
        t.setSortOrder(0);
        return t;
    }

    private static BookshelfTheme pine() {
        BookshelfTheme t = new BookshelfTheme();
        t.setId("warm-pine");
        t.setDisplayName("밝은 메이플");
        t.setDescription("햇빛 드는 카페 책장. 산뜻하고 가볍게.");
        t.setTier(BookshelfThemeTier.FREE);
        t.setWoodColor("#E5D2B0");
        t.setShadowColor("#C9B088");
        t.setWallColor("#FAF7F2");
        t.setSortOrder(1);
        return t;
    }

    private static BookshelfTheme industrial() {
        BookshelfTheme t = new BookshelfTheme();
        t.setId("industrial-frame");
        t.setDisplayName("스틸 프레임");
        t.setDescription("매트 블랙 스틸 + 미드톤 우드. 모던한 로프트 무드.");
        t.setTier(BookshelfThemeTier.FREE);
        t.setWoodColor("#C9A878");
        t.setShadowColor("#8B6F4A");
        t.setWallColor("#E8E5DF");
        t.setFrameColor("#2C2A28");
        t.setSortOrder(2);
        return t;
    }
}
