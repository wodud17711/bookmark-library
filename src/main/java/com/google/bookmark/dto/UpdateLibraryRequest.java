package com.google.bookmark.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateLibraryRequest(
    @Size(min = 1, max = 128) String title,
    @Size(max = 64) String paletteName,
    @Size(max = 64) String floorPaletteName,
    @Size(max = 1000) String welcomeMessage,
    @Pattern(regexp = "^(DAY|EVENING|NIGHT)$") String entranceMood,
    Boolean isPublic
) {}
