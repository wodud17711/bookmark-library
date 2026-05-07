package com.google.bookmark.service;

import com.google.bookmark.domain.Book;
import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.BookshelfZone;
import com.google.bookmark.domain.EntranceMood;
import com.google.bookmark.domain.Library;
import com.google.bookmark.domain.User;
import com.google.bookmark.dto.BookResponse;
import com.google.bookmark.dto.BookshelfResponse;
import com.google.bookmark.dto.CreateLibraryRequest;
import com.google.bookmark.dto.LibraryOgMetadata;
import com.google.bookmark.dto.LibraryResponse;
import com.google.bookmark.dto.LibrarySummary;
import com.google.bookmark.dto.UpdateLibraryRequest;
import com.google.bookmark.repository.LibraryRepository;
import com.google.bookmark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryService {

    private final LibraryRepository libraryRepository;
    private final UserRepository userRepository;

    // ─── Read ────────────────────────────────────────────

    /** Returns the user's currently selected library, or first if none selected. */
    public LibraryResponse getCurrentLibrary(Long userId) {
        return toResponse(loadCurrentLibrary(userId));
    }

    public List<LibrarySummary> listLibrariesForUser(Long userId) {
        Long currentId = userRepository.findById(userId)
            .map(User::getCurrentLibraryId)
            .orElse(null);
        return libraryRepository.findAllByUserIdOrderBySortOrderAscIdAsc(userId).stream()
            .map(lib -> toSummary(lib, currentId))
            .toList();
    }

    /** Public-facing view by slug. 404 if not public or doesn't exist. */
    public LibraryResponse getPublicLibrary(String username, String slug) {
        Library library = libraryRepository.findByUserUsernameAndSlug(username, slug)
            .filter(Library::isPublic)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Library not found"
            ));
        return toPublicResponse(library);
    }

    /** Legacy/short URL: first public library for a username. */
    public LibraryResponse getFirstPublicLibrary(String username) {
        Library library = libraryRepository
            .findFirstByUserUsernameAndIsPublicTrueOrderBySortOrderAscIdAsc(username)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Library not found"
            ));
        return toPublicResponse(library);
    }

    // ─── Write ───────────────────────────────────────────

    @Transactional
    public LibraryResponse updateCurrentLibrary(Long userId, UpdateLibraryRequest request) {
        return updateLibrary(userId, loadCurrentLibrary(userId), request);
    }

    @Transactional
    public LibraryResponse updateLibraryById(Long userId, Long libraryId, UpdateLibraryRequest request) {
        Library library = loadOwnedLibrary(userId, libraryId);
        return updateLibrary(userId, library, request);
    }

    @Transactional
    public LibraryResponse createLibrary(Long userId, CreateLibraryRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getLibraries().size() >= User.MAX_LIBRARIES) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                String.format(
                    "도서관은 %d개까지만 만들 수 있어요. 기존 도서관을 정리해서 새로 만들 자리를 비워주세요.",
                    User.MAX_LIBRARIES
                )
            );
        }

        String slug = chooseSlug(user.getId(), request.slug(), request.title());
        int sortOrder = user.getLibraries().stream()
            .mapToInt(Library::getSortOrder)
            .max()
            .orElse(-1) + 1;

        Library library = new Library();
        library.setTitle(request.title().trim());
        library.setSlug(slug);
        library.setSortOrder(sortOrder);
        user.addLibrary(library);

        // Auto-switch to the newly created library so the user sees it.
        libraryRepository.flush(); // ensure id assigned
        user.setCurrentLibraryId(library.getId());

        return toResponse(library);
    }

    @Transactional
    public LibraryResponse switchCurrentLibrary(Long userId, Long libraryId) {
        Library library = loadOwnedLibrary(userId, libraryId);
        User user = library.getUser();
        user.setCurrentLibraryId(library.getId());
        return toResponse(library);
    }

    // ─── OG (public share metadata) ──────────────────────

    /** True if the library exists and is publicly accessible. Used by the OG
     *  image endpoint to distinguish "exists, serve generic banner" from
     *  "doesn't exist or private, return 404". */
    public boolean isPublicLibraryPresent(String username, String slug) {
        return libraryRepository.findByUserUsernameAndSlug(username, slug)
            .filter(Library::isPublic)
            .isPresent();
    }

    /**
     * OG metadata for the public-share HTML at {@code /u/{username}/{slug}}.
     * Returns empty if the library doesn't exist or is private — the caller
     * should serve a generic fallback in that case so crawlers don't 500.
     *
     * <p>Counts only PUBLIC bookshelves so a visitor can't infer the size of
     * the owner's private room from the share-page meta description.
     */
    public Optional<LibraryOgMetadata> getPublicLibraryOgMetadata(String username, String slug) {
        return libraryRepository.findByUserUsernameAndSlug(username, slug)
            .filter(Library::isPublic)
            .map(lib -> new LibraryOgMetadata(
                lib.getTitle(),
                lib.getWelcomeMessage(),
                lib.getUser().getUsername(),
                lib.getUser().getDisplayName(),
                lib.getSlug(),
                (int) lib.getBookshelves().stream()
                    .filter(s -> s.getZone() == BookshelfZone.PUBLIC)
                    .count()
            ));
    }

    // ─── Internal ────────────────────────────────────────

    private LibraryResponse updateLibrary(Long userId, Library library, UpdateLibraryRequest request) {
        if (request.title() != null) {
            library.setTitle(request.title().trim());
        }
        if (request.paletteName() != null) {
            library.setPaletteName(request.paletteName());
        }
        if (request.floorPaletteName() != null) {
            library.setFloorPaletteName(request.floorPaletteName());
        }
        if (request.welcomeMessage() != null) {
            library.setWelcomeMessage(request.welcomeMessage());
        }
        if (request.entranceMood() != null) {
            library.setEntranceMood(EntranceMood.valueOf(request.entranceMood()));
        }
        if (request.isPublic() != null) {
            library.setPublic(request.isPublic());
        }
        return toResponse(library);
    }

    private Library loadCurrentLibrary(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Long currentId = user.getCurrentLibraryId();
        if (currentId != null) {
            return libraryRepository.findByIdAndUserId(currentId, userId)
                .orElseGet(() -> firstLibraryOrThrow(userId));
        }
        return firstLibraryOrThrow(userId);
    }

    private Library firstLibraryOrThrow(Long userId) {
        return libraryRepository.findFirstByUserIdOrderBySortOrderAscIdAsc(userId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No library found for user " + userId
            ));
    }

    private Library loadOwnedLibrary(Long userId, Long libraryId) {
        return libraryRepository.findByIdAndUserId(libraryId, userId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Library not found"
            ));
    }

    private String chooseSlug(Long userId, String requested, String title) {
        String base = (requested != null && !requested.isBlank())
            ? requested.trim().toLowerCase()
            : slugify(title);
        if (base.isBlank()) base = "library";
        if (!libraryRepository.existsByUserIdAndSlug(userId, base)) return base;
        int n = 2;
        while (libraryRepository.existsByUserIdAndSlug(userId, base + "-" + n)) n++;
        return base + "-" + n;
    }

    private static String slugify(String text) {
        if (text == null) return "";
        String lower = text.trim().toLowerCase();
        // Replace spaces with hyphens, drop disallowed characters.
        // Korean chars are not URL-safe; if all input is non-ASCII we'll fall back to "library".
        return lower
            .replaceAll("\\s+", "-")
            .replaceAll("[^a-z0-9-]", "")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
    }

    private String floorOrDefault(String name) {
        return (name == null || name.isBlank()) ? "cream-pine" : name;
    }

    // ─── Mapping ─────────────────────────────────────────

    private LibrarySummary toSummary(Library lib, Long currentId) {
        return new LibrarySummary(
            lib.getId(),
            lib.getSlug(),
            lib.getTitle(),
            lib.getSortOrder(),
            lib.isPublic(),
            currentId != null && currentId.equals(lib.getId()),
            lib.getBookshelves().size()
        );
    }

    private LibraryResponse toResponse(Library library) {
        return new LibraryResponse(
            library.getId(),
            library.getSlug(),
            library.getTitle(),
            library.getPaletteName(),
            floorOrDefault(library.getFloorPaletteName()),
            library.getWelcomeMessage(),
            library.getEntranceMood().name(),
            library.isPublic(),
            library.getUser().getUsername(),
            library.getUser().getDisplayName(),
            library.getBookshelves().stream().map(this::toBookshelfResponse).toList()
        );
    }

    private LibraryResponse toPublicResponse(Library library) {
        return new LibraryResponse(
            library.getId(),
            library.getSlug(),
            library.getTitle(),
            library.getPaletteName(),
            floorOrDefault(library.getFloorPaletteName()),
            library.getWelcomeMessage(),
            library.getEntranceMood().name(),
            library.isPublic(),
            library.getUser().getUsername(),
            library.getUser().getDisplayName(),
            library.getBookshelves().stream()
                .filter(s -> s.getZone() == BookshelfZone.PUBLIC)
                .map(this::toBookshelfResponse)
                .toList()
        );
    }

    private BookshelfResponse toBookshelfResponse(Bookshelf shelf) {
        return new BookshelfResponse(
            shelf.getId(),
            shelf.getTitle(),
            shelf.getZone().name(),
            shelf.getPosition(),
            shelf.getMaxBooks(),
            shelf.getWoodColor(),
            shelf.getBooks().stream().map(this::toBookResponse).toList()
        );
    }

    private BookResponse toBookResponse(Book book) {
        return new BookResponse(
            book.getId(),
            book.getUrl(),
            book.getTitle(),
            book.getSiteName(),
            book.getCoverColor(),
            book.getTitleColor(),
            book.getPosition(),
            book.isFavorite(),
            book.getFaviconUrl(),
            book.getOgImageUrl()
        );
    }
}
