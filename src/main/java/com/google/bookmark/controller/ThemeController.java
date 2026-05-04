package com.google.bookmark.controller;

import com.google.bookmark.dto.FloorThemeResponse;
import com.google.bookmark.dto.ThemeResponse;
import com.google.bookmark.service.BookshelfThemeService;
import com.google.bookmark.service.FloorThemeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ThemeController {

    private final BookshelfThemeService themeService;
    private final FloorThemeService floorThemeService;

    @GetMapping("/themes")
    public List<ThemeResponse> listThemes() {
        return themeService.findAll();
    }

    @GetMapping("/floor-themes")
    public List<FloorThemeResponse> listFloorThemes() {
        return floorThemeService.findAll();
    }
}
