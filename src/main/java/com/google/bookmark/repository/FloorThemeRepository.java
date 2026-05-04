package com.google.bookmark.repository;

import com.google.bookmark.domain.FloorTheme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FloorThemeRepository extends JpaRepository<FloorTheme, String> {

    List<FloorTheme> findAllByOrderBySortOrderAsc();
}
