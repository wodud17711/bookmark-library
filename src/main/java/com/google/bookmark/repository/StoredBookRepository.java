package com.google.bookmark.repository;

import com.google.bookmark.domain.StoredBook;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StoredBookRepository extends JpaRepository<StoredBook, Long> {

    List<StoredBook> findAllByUserIdOrderByAddedAtAsc(Long userId);

    long countByUserId(Long userId);

    /** Same matching rules as BookRepository.searchByUserId. */
    @Query("""
        select s from StoredBook s
        where s.user.id = :userId
        and (
            lower(s.title) like :q
            or lower(s.url) like :q
            or lower(coalesce(s.siteName, '')) like :q
            or lower(coalesce(s.originalFolder, '')) like :q
        )
        order by s.addedAt asc
        """)
    List<StoredBook> searchByUserId(@Param("userId") Long userId, @Param("q") String q, Pageable pageable);
}
