package com.google.bookmark.repository;

import com.google.bookmark.domain.Library;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LibraryRepository extends JpaRepository<Library, Long> {

    Optional<Library> findByUserId(Long userId);

    Optional<Library> findByUserUsername(String username);
}
