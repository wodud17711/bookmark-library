package com.google.bookmark.repository;

import com.google.bookmark.domain.BookshelfTheme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookshelfThemeRepository extends JpaRepository<BookshelfTheme, String> {

    List<BookshelfTheme> findAllByOrderBySortOrderAsc();
}
