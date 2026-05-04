package com.google.bookmark.service;

import com.google.bookmark.domain.Library;
import com.google.bookmark.domain.Report;
import com.google.bookmark.domain.ReportReason;
import com.google.bookmark.repository.LibraryRepository;
import com.google.bookmark.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final LibraryRepository libraryRepository;

    @Transactional
    public void submitReport(Long libraryId, Long reporterUserId, String reasonStr, String details) {
        // Only public libraries are reportable. Don't reveal whether private
        // libraries exist; surface 404 either way.
        Library library = libraryRepository.findById(libraryId)
            .filter(Library::isPublic)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "도서관을 찾을 수 없어요."
            ));

        ReportReason reason;
        try {
            reason = ReportReason.valueOf(reasonStr);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "올바른 신고 사유를 선택해주세요."
            );
        }

        String trimmedDetails = (details == null) ? null : details.trim();
        if (trimmedDetails != null && trimmedDetails.length() > 1000) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "신고 내용은 1000자 이내로 입력해주세요."
            );
        }

        Report report = new Report();
        report.setLibraryId(library.getId());
        report.setReporterUserId(reporterUserId);
        report.setReason(reason);
        report.setDetails(trimmedDetails);
        reportRepository.save(report);

        // Operator sees these in logs (or DB); email notification is a future step.
        long pendingForLibrary = reportRepository.countByLibraryIdAndStatus(library.getId(), "PENDING");
        log.warn(
            "[REPORT] library={} ({}) reporter={} reason={} pending_total={} details={}",
            library.getId(),
            library.getSlug(),
            reporterUserId == null ? "anon" : reporterUserId,
            reason,
            pendingForLibrary,
            shortenForLog(trimmedDetails)
        );
    }

    private static String shortenForLog(String s) {
        if (s == null || s.isEmpty()) return "(none)";
        return s.length() <= 100 ? s : s.substring(0, 97) + "...";
    }
}
