package com.google.bookmark.repository;

import com.google.bookmark.domain.Book;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * Case-insensitive substring search across all of the user's books
     * (any library, any zone). Caller pre-lowercases and adds % wildcards.
     */
    @Query("""
        select b from Book b
        where b.bookshelf.library.user.id = :userId
        and (
            lower(b.title) like :q
            or lower(b.url) like :q
            or lower(coalesce(b.siteName, '')) like :q
        )
        order by b.bookshelf.library.sortOrder asc,
                 b.bookshelf.position asc,
                 b.position asc
        """)
    List<Book> searchByUserId(@Param("userId") Long userId, @Param("q") String q, Pageable pageable);
}
