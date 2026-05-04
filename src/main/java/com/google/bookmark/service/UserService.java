package com.google.bookmark.service;

import com.google.bookmark.domain.Bookshelf;
import com.google.bookmark.domain.BookshelfZone;
import com.google.bookmark.domain.Library;
import com.google.bookmark.domain.User;
import com.google.bookmark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private static final String USERNAME_FALLBACK_PREFIX = "reader";
    private static final String DEFAULT_LIBRARY_SLUG = "main";

    private final UserRepository userRepository;

    public User findOrCreate(String googleSub, String email, String displayName, String pictureUrl) {
        return userRepository.findByGoogleSub(googleSub)
            .map(existing -> refreshProfile(existing, email, displayName, pictureUrl))
            .orElseGet(() -> createNewUser(googleSub, email, displayName, pictureUrl));
    }

    private User refreshProfile(User user, String email, String displayName, String pictureUrl) {
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setPictureUrl(pictureUrl);
        return user;
    }

    private User createNewUser(String googleSub, String email, String displayName, String pictureUrl) {
        User user = new User();
        user.setGoogleSub(googleSub);
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setPictureUrl(pictureUrl);
        user.setUsername(generateUniqueUsername(email));

        Library library = new Library();
        library.setTitle(displayName + "의 도서관");
        library.setSlug(DEFAULT_LIBRARY_SLUG);
        library.setSortOrder(0);
        user.addLibrary(library);

        library.addBookshelf(makeShelf("내 책장", BookshelfZone.PUBLIC, 0));
        library.addBookshelf(makeShelf("프라이빗 룸", BookshelfZone.PRIVATE, 1));

        // currentLibraryId is set after save (id assigned by DB)
        User saved = userRepository.save(user);
        saved.setCurrentLibraryId(saved.getLibraries().get(0).getId());
        return saved;
    }

    private Bookshelf makeShelf(String title, BookshelfZone zone, int position) {
        Bookshelf shelf = new Bookshelf();
        shelf.setTitle(title);
        shelf.setZone(zone);
        shelf.setPosition(position);
        return shelf;
    }

    private String generateUniqueUsername(String email) {
        String base = email.split("@")[0]
            .replaceAll("[^a-zA-Z0-9_-]", "_")
            .toLowerCase();
        if (base.isBlank()) {
            base = USERNAME_FALLBACK_PREFIX;
        }
        if (!userRepository.existsByUsername(base)) {
            return base;
        }
        int suffix = 1;
        while (userRepository.existsByUsername(base + suffix)) {
            suffix++;
        }
        return base + suffix;
    }
}
