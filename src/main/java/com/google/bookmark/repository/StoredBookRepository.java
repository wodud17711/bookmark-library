package com.google.bookmark.repository;

import com.google.bookmark.domain.StoredBook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoredBookRepository extends JpaRepository<StoredBook, Long> {

    List<StoredBook> findAllByUserIdOrderByAddedAtAsc(Long userId);

    long countByUserId(Long userId);
}
