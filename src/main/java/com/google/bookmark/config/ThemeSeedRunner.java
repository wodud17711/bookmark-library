package com.google.bookmark.config;

import com.google.bookmark.service.BookshelfThemeService;
import com.google.bookmark.service.FloorThemeService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class ThemeSeedRunner implements CommandLineRunner {

    private final BookshelfThemeService themeService;
    private final FloorThemeService floorThemeService;

    @Override
    public void run(String... args) {
        themeService.seedDefaultsIfMissing();
        floorThemeService.seedDefaultsIfMissing();
    }
}
