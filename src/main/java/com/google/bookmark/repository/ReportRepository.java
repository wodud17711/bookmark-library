package com.google.bookmark.repository;

import com.google.bookmark.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {

    long countByLibraryIdAndStatus(Long libraryId, String status);
}
