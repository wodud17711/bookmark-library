package com.google.bookmark.repository;

import com.google.bookmark.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByGoogleSub(String googleSub);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
}
