package com.google.bookmark.repository;

import com.google.bookmark.domain.Library;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LibraryRepository extends JpaRepository<Library, Long> {

    List<Library> findAllByUserIdOrderBySortOrderAscIdAsc(Long userId);

    Optional<Library> findByIdAndUserId(Long id, Long userId);

    Optional<Library> findFirstByUserIdOrderBySortOrderAscIdAsc(Long userId);

    boolean existsByUserIdAndSlug(Long userId, String slug);

    Optional<Library> findByUserUsernameAndSlug(String username, String slug);

    /** Legacy: first public library for a username (used by /u/{username} short URL). */
    Optional<Library> findFirstByUserUsernameAndIsPublicTrueOrderBySortOrderAscIdAsc(String username);
}
