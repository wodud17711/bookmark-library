package com.google.bookmark.repository;

import com.google.bookmark.domain.Bookshelf;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookshelfRepository extends JpaRepository<Bookshelf, Long> {
}
