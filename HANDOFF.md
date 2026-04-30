# HANDOFF

## [2026-04-30] 최근 작업 요약

오늘 하루 종일 작업: OAuth 디버깅 → 프로젝트 비전 설계 → 풀스택 부트스트랩 → 데이터 모델 → CRUD UI → 디자인 시스템 → 북마크 import + 창고 시스템.

### 오늘 한 일

#### Phase 1 — OAuth `invalid_client` 디버깅
- `application.yml`이 환경변수(`GOOGLE_CLIENT_ID/SECRET`)에서 값을 받는데 invalid_client 에러
- 콘솔에 `BookmarkApplication.java`에서 println으로 환경변수 확인 → 형식은 OK였음
- TRACE 로깅 켜서 실제 원인 확인: `Google이 client_secret 거부` (즉 ID는 맞고 secret이 틀림)
- 원인 판명: **사용자가 Secret을 GPT에 텍스트화 시켜서 옮기는 과정에서 일부 문자가 깨짐**. 직접 타이핑으로 수정 → 해결
- 교훈은 [.env.example](.env.example) 코멘트에 명시 ("OCR/transcription 금지")

#### Phase 2 — 비전·설계 정리 (project_vision.md 메모리 업데이트)
- **북극성**: "사용자가 도서관 UI를 꾸며서 공유 올리는 그런 제품" — 도구가 아니라 캔버스
- **레이아웃**: 평면도 탑뷰 (입구/책장/베스트셀러/프라이빗 룸/창고) — 모바일은 같은 평면도를 90° 회전 (CSS 회전 X, Pixi.js 좌표계로)
- **3 책장 테마** (모두 v1은 무료, 결제 BM 훅만 준비): warm-walnut(기본) / warm-pine / industrial-frame
- **다중 도서관**: v2.0+ 확정. 현재는 User↔Library 1:1, 구조만 1:N 확장 가능하게.
- **"도서관 vs 기록보관소"** 정체성 — 도서관은 큐레이션됨 (책장당 30권 의도된 제약), 5000권 사용자는 창고로
- **수익화 BM 후보**: 책장 테마, 데코 아이템(화병/식물), 도서관 분위기(낮/저녁/밤), OG 이미지

#### Phase 3 — 풀스택 부트스트랩 (Checkpoint A)
- [build.gradle](build.gradle): MySQL 제거 → PostgreSQL 추가, validation starter 추가
- [src/main/resources/application.yml](src/main/resources/application.yml): 프로필 분리 (`local` = H2 파일모드 기본, `postgres` = PG)
- [docker-compose.yml](docker-compose.yml): PG 컨테이너 (Docker 없으면 사용 안 함)
- [.env.example](.env.example): 환경변수 가이드 + Secret OCR 금지 경고
- 패키지 구조: `config/`, `domain/`, `repository/`, `service/`, `controller/`, `dto/`, `security/`
- 프론트엔드 부트스트랩: `frontend/` 디렉토리에 React 19 + Vite 8 + TS + Pixi.js 8 + Tailwind v4 + react-router-dom 7 + axios
- [frontend/vite.config.ts](frontend/vite.config.ts): `/api`, `/oauth2`, `/login/oauth2`, `/logout` 프록시 → localhost:8081
- [frontend/index.html](frontend/index.html): Pretendard 가변 폰트 CDN 로드
- [frontend/src/index.css](frontend/src/index.css): Tailwind v4 `@theme` 블록으로 디자인 토큰 (color, font, radius, shadow)

#### Phase 4 — OAuth 통합 (Checkpoint A.5 + B)
- [src/main/java/com/google/bookmark/config/SecurityConfig.java](src/main/java/com/google/bookmark/config/SecurityConfig.java):
  - OAuth 성공 → frontend URL로 redirect (`${app.frontend.url}/`)
  - `/api/**` 인증 실패 → 401 (XHR 친화적, 리다이렉트 안 함)
  - CSRF는 `/api/**`에서 disabled (세션+쿠키 기반, X-Requested-With 헤더 활용)
- [security/UserPrincipal.java](src/main/java/com/google/bookmark/security/UserPrincipal.java) — OAuth2/OIDC 양쪽이 구현하는 공통 인터페이스
- [security/CustomOAuth2User.java](src/main/java/com/google/bookmark/security/CustomOAuth2User.java) + [CustomOidcUser.java](src/main/java/com/google/bookmark/security/CustomOidcUser.java) — 둘 다 `UserPrincipal` 구현
- [security/CustomOAuth2UserService.java](src/main/java/com/google/bookmark/security/CustomOAuth2UserService.java) + [CustomOidcUserService.java](src/main/java/com/google/bookmark/security/CustomOidcUserService.java) — Google은 `openid` scope 때문에 OIDC 흐름. 한 가지만 wired 했다가 NPE 났던 버그 → 둘 다 wire함
- 컨트롤러는 `@AuthenticationPrincipal UserPrincipal`로 통일

#### Phase 5 — 도메인 모델 + Repository (Checkpoint B)
- [domain/User.java](src/main/java/com/google/bookmark/domain/User.java): id, googleSub, email, displayName, pictureUrl, username, library (1:1 cascade ALL)
- [domain/Library.java](src/main/java/com/google/bookmark/domain/Library.java): user (1:1), title, isPublic, paletteName, welcomeMessage(TEXT), entranceMood(enum), bookshelves (1:N cascade ALL OrphanRemoval, @OrderBy position)
- [domain/Bookshelf.java](src/main/java/com/google/bookmark/domain/Bookshelf.java): library, title, **zone (PUBLIC/PRIVATE)**, position, maxBooks=30, woodColor, books (1:N cascade ALL)
- [domain/Book.java](src/main/java/com/google/bookmark/domain/Book.java): bookshelf, url, title, siteName, coverColor, titleColor, position, isFavorite, faviconUrl, ogImageUrl
- [domain/StoredBook.java](src/main/java/com/google/bookmark/domain/StoredBook.java): user 직속 (Library 무관, **v2 다중 도서관 대비**), url, title, siteName, originalFolder
- [domain/BookshelfTheme.java](src/main/java/com/google/bookmark/domain/BookshelfTheme.java): id(string), displayName, **tier (FREE/PAID)**, **priceKrw**, woodColor, shadowColor, wallColor, frameColor — 결제 BM 준비된 구조
- [domain/BookshelfZone.java](src/main/java/com/google/bookmark/domain/BookshelfZone.java), [EntranceMood.java](src/main/java/com/google/bookmark/domain/EntranceMood.java), [BookshelfThemeTier.java](src/main/java/com/google/bookmark/domain/BookshelfThemeTier.java) — enum
- 5개 Repository 모두 Spring Data JPA: `UserRepository`, `LibraryRepository`, `BookshelfRepository`, `BookRepository`, `StoredBookRepository`, `BookshelfThemeRepository`

#### Phase 6 — Service / Controller / DTO
- [UserService.findOrCreate](src/main/java/com/google/bookmark/service/UserService.java#L21): OAuth 첫 로그인 시 User 생성 + Library 1개 + 책장 2개 (`내 책장` PUBLIC, `프라이빗 룸` PRIVATE) 자동 생성. username은 email 앞부분 + 충돌시 숫자 suffix
- [LibraryService](src/main/java/com/google/bookmark/service/LibraryService.java): GET/PATCH library, lazy loading은 `@Transactional(readOnly=true)` 안에서 처리
- [BookshelfService](src/main/java/com/google/bookmark/service/BookshelfService.java) / [BookService](src/main/java/com/google/bookmark/service/BookService.java): create/update/delete + **소유권 검증 (남의 데이터는 404로 처리, 존재 leak 방지)**
- [BookService.moveToStorage](src/main/java/com/google/bookmark/service/BookService.java): Book 삭제 + StoredBook 생성, originalFolder=원래 책장 이름
- [BookmarkImportService](src/main/java/com/google/bookmark/service/BookmarkImportService.java): 두 모드(`SHELVES`/`STORAGE`), 폴더 평탄화, 30권 초과 폴더 자동 분할 `이름 (1)`/`이름 (2)`, 다른 폴더와 leaf 이름 충돌시 부모 경로 자동 추가
- [StoredBookService](src/main/java/com/google/bookmark/service/StoredBookService.java): list, 일괄 이동(가득 책장 거부), 삭제
- [BookshelfThemeService.seedDefaultsIfMissing](src/main/java/com/google/bookmark/service/BookshelfThemeService.java) + [config/ThemeSeedRunner.java](src/main/java/com/google/bookmark/config/ThemeSeedRunner.java): `CommandLineRunner`로 앱 시작 시 3개 테마 자동 시드 (이미 있으면 skip)
- 컨트롤러: [AuthController](src/main/java/com/google/bookmark/controller/AuthController.java) (`/api/me`), [LibraryController](src/main/java/com/google/bookmark/controller/LibraryController.java) (`GET/PATCH /api/library`), [BookshelfController](src/main/java/com/google/bookmark/controller/BookshelfController.java), [BookController](src/main/java/com/google/bookmark/controller/BookController.java) (`POST /api/books`, `PATCH/DELETE /api/books/{id}`, `POST /api/books/{id}/to-storage`), [ThemeController](src/main/java/com/google/bookmark/controller/ThemeController.java), [BookmarkImportController](src/main/java/com/google/bookmark/controller/BookmarkImportController.java), [StorageController](src/main/java/com/google/bookmark/controller/StorageController.java)
- 모든 입력 DTO에 Bean Validation: `@NotBlank`, `@Size`, `@Pattern`(hex color, enum), `@Min`

#### Phase 7 — UI 디자인 시스템
- Tailwind v4 `@theme` 블록 디자인 토큰 (라이트 크림 + 월넛 액센트, 갤러리 벽 컨셉)
- 5개 기본 컴포넌트 [frontend/src/components/ui/](frontend/src/components/ui/): `Button`, `IconButton`, `TextInput`, `Card`, `Modal`(Portal+ESC+scroll lock)
- LoginPage 리뉴얼 (책장 SVG 로고)
- LibraryPage: sticky header, Card 기반 책장, hover 호환

#### Phase 8 — CRUD UI (Checkpoint C-1)
- 4개 모달 [frontend/src/components/library/](frontend/src/components/library/):
  - `AddBookshelfModal` (이름 + zone)
  - `AddBookModal` (URL + 선택 제목)
  - `EditBookshelfModal` (편집 + 삭제 확인)
  - `EditBookModal` (편집 + **책장 dropdown 이동** + **창고로 옮기기** + 즐겨찾기 + 삭제)
- [hooks/useLibrary.ts](frontend/src/hooks/useLibrary.ts) — fetch + refetch 상태 관리
- [LibraryPage](frontend/src/pages/LibraryPage.tsx) — `📚 책장` / `🔒 프라이빗 룸` 두 섹션, 헤더에 `📦 N` 창고 카운트 + `가져오기` 버튼

#### Phase 9 — 북마크 Import + 창고 (Checkpoint C-1.5)
- 클라이언트 파싱 [utils/parseBookmarksHtml.ts](frontend/src/utils/parseBookmarksHtml.ts): `DOMParser`로 Netscape HTML 파싱, 컨테이너 폴더 무시 (책 직접 든 폴더만)
- API 클라이언트 [api/bookmarks.ts](frontend/src/api/bookmarks.ts), [api/storage.ts](frontend/src/api/storage.ts)
- 모달 [components/library/ImportBookmarksModal.tsx](frontend/src/components/library/ImportBookmarksModal.tsx): 4단계 (pick → preview → importing → done), **두 모드 명시 표시** (`자동으로 책장 만들기` / `창고로 모두 보내기`)
- 모달 [components/library/StorageDrawer.tsx](frontend/src/components/library/StorageDrawer.tsx): 폴더별 그룹핑 + indeterminate 체크박스 + dropdown으로 책장 선택 + 일괄 이동
- 백엔드 capacity check: `BookshelfService.create`, `BookService.create/update`, `StoredBookService.moveToShelf` 모두 `maxBooks` 초과시 409
- 테스트 데이터 [samples/chrome-bookmarks-sample.html](samples/chrome-bookmarks-sample.html): 91권 (자료 35권→분할, 기타북마크 31권→분할, 그 외 5/12/8) — auto-split + 가득 책장 시나리오 검증용

### 해결한 버그

1. **OAuth 콜백 후 frontend 대신 backend(`localhost:8081/`) 으로 redirect되어 Whitelabel 404**
   - 원인: SecurityConfig 없어서 Spring 기본 동작 (same-origin /로 redirect)
   - 해결: `SecurityConfig.successHandler`로 `${app.frontend.url}/` 명시 redirect

2. **OAuth 성공 후 `@AuthenticationPrincipal CustomOAuth2User` 가 null → NPE**
   - 원인: Google이 `openid` scope 때문에 OIDC 흐름. `CustomOAuth2UserService` (일반 OAuth2 전용) 만 wire 했었음 → 실제 principal은 `DefaultOidcUser`라 캐스팅 실패
   - 해결: `CustomOidcUserService` 추가 + `UserPrincipal` 인터페이스로 양쪽 통합

3. **AntPathRequestMatcher 컴파일 에러** (Spring Security 7에서 제거됨)
   - 해결: `RequestMatcher` 람다 (`request -> request.getRequestURI().startsWith("/api/")`) 로 대체

4. **/api/library 500 → MultipleBagFetchException 의심**
   - 시도했던 것: `LibraryRepository`에 `left join fetch ... left join fetch` 이중 fetch JPQL 추가
   - 실제 해결: 단순한 `findByUserId`로 되돌리고, `@Transactional(readOnly=true)` 안에서 lazy loading 활용
   - 교훈: 무리한 fetch join보다 트랜잭션 안에서 lazy 가 안전

5. **Form Enter 키로 submit 안 됨**
   - 원인: `Modal`의 footer가 `<form>` 외부에 있어 Enter가 submit 트리거 안 함
   - 해결: 4개 모달 모두 form에 id 부여 + submit Button에 `type="submit" form="..."` HTML 표준 속성 사용

6. **북마크 import 시 91권이 91개 1권 책장으로 쪼개진 버그**
   - 원인: `chooseShelfName`이 "이미 등록된 이름"을 "다른 폴더와의 충돌"로 잘못 인식 → 매 책마다 새 이름 (`기타 북마크`, `기타 북마크 (2)`, `기타 북마크 (3)`...) 생성
   - 해결: 2단계 분리 — 먼저 unique `folderPath → shelfName` 맵 만들고, 그 매핑으로 entry group화. 새 메서드 `pickShelfName`/`uniquify`. [BookmarkImportService.java](src/main/java/com/google/bookmark/service/BookmarkImportService.java)

### 현재 상태

#### 동작 확인됨
- ✅ Google OAuth 로그인 (OIDC 흐름)
- ✅ 첫 로그인 시 User + Library + 책장 2개 (PUBLIC/PRIVATE) 자동 생성
- ✅ 책장 CRUD: 추가/이름변경/zone 변경/삭제(안의 책 cascade)
- ✅ 책 CRUD: 추가/제목 편집/사이트명/즐겨찾기/책장 dropdown으로 이동/창고로 옮기기/삭제
- ✅ 북마크 HTML import — `자동으로 책장 만들기` 와 `창고로 모두 보내기` 두 모드, 30권 초과 폴더 자동 분할 (`(1)`/`(2)`)
- ✅ 창고: 폴더별 그룹핑, 일괄 선택, 책장 선택 후 이동, 가득 책장 거부
- ✅ Form Enter 키 submit
- ✅ 소유권 검증 (남의 책장/책 접근 시 404)
- ✅ 백엔드 컴파일 성공, 프론트엔드 TypeScript 통과

#### 미완성 / 미구현
- ❌ Pixi.js 평면도 시각화 — 완전 미구현 (LibraryPage에 `PixiPlaceholder` 카드만 있음)
- ❌ 도서관 설정 패널 — `welcomeMessage`, `entranceMood`, `paletteName`, `isPublic` 필드는 있지만 사용자 편집 UI 없음. 백엔드 `PATCH /api/library`는 동작
- ❌ 공유 URL `/u/{username}` — `UserRepository.findByUsername` 있지만 컨트롤러는 없음
- ❌ 베스트셀러(즐겨찾기 모음) UI — `Book.isFavorite` 필드는 있고 별표 표시도 되지만 별도 진열대 영역 없음
- ❌ 다중 도서관 (v2.0)
- ❌ Chrome 확장 (v2.0+)
- ❌ OG 이미지 자동 생성 (출시 전 필요)
- ❌ 결제/유료 테마 (v2.0+, 데이터 모델만 준비됨: `BookshelfTheme.tier`, `priceKrw`)

### 다음에 이어서 할 일

사용자가 결정한 v1.0 남은 작업 순서: **C-3 → C-4 → C-2**

#### 1순위: Checkpoint C-3 — 도서관 설정 패널
- 백엔드는 이미 다 됨 (`PATCH /api/library` + `UpdateLibraryRequest` DTO)
- **만들 것**: 헤더의 ⚙ 또는 별도 메뉴 → `LibrarySettingsModal` (또는 슬라이드인 패널)
- 항목:
  - 도서관 이름 (`title`)
  - 환영 메시지 (`welcomeMessage`, max 1000자) — 입구에 표시될 텍스트
  - 입구 분위기 (`entranceMood`: DAY/EVENING/NIGHT) — 라디오 버튼
  - 책장 테마 (`paletteName`) — `GET /api/themes` 호출해서 3개 옵션 카드로 표시, FREE/PAID tier 표시 (PAID는 v1에선 다 FREE이므로 일단 제약 없음)
  - 공개 여부 (`isPublic`) — 토글
- 추가 API 클라이언트: [frontend/src/api/library.ts](frontend/src/api/library.ts)에 `updateLibrary`는 이미 있음, themes fetch만 추가하면 됨

#### 2순위: Checkpoint C-4 — 공유 프로필 URL
- **백엔드 새 엔드포인트**: `GET /api/u/{username}/library` — 인증 X, public 도서관만 반환 (zone=PUBLIC 책장만, isPublic=true 도서관만)
- 비공개 도서관이거나 사용자 없으면 404
- `LibraryRepository.findByUserUsername`은 이미 있음
- **프론트엔드**:
  - 새 라우트: `/u/:username` → `PublicLibraryPage`
  - LibraryPage와 비슷하지만 read-only, 편집 액션 없음, 창고/프라이빗 룸 없음
  - 베스트셀러 책 (isFavorite=true) 모아서 별도 영역에 보여주는 것도 같이
- 헤더의 "공유" 버튼 → 클립보드 복사 (`localhost:5173/u/wodud17711` 같은 형태)

#### 3순위: Checkpoint C-2 — Pixi.js 평면도 시각화
- 가장 큰 작업. 다른 게 다 끝난 뒤 비주얼만 입히는 단계
- 정면뷰 X, **탑뷰 평면도** (사용자 직접 그린 그림 기준)
- 좌우 벽에 책장 늘어선 형태, 입구 위, 프라이빗 룸 아래, 베스트셀러 중앙, 창고 한 켠
- **모바일 세로 시 Pixi 씬 자체를 90° 회전** (CSS 변환 X — Pixi 좌표계로 처리)
- 책장 클릭 → 줌인 + 회전 전환 → 책장 상세 (정면뷰, 책 제목 가로로 읽힘)
- 사람 실루엣 책 임계치 (50/100/200권) 마다 등장
- 컨셉 결정사항은 메모리(`project_vision.md`) 참고

### 미해결 이슈 / 막힌 지점

- **Hibernate ddl-auto=update의 NOT NULL 추가 컬럼 한계**: 기존 행이 있는 테이블에 NOT NULL 컬럼을 추가하면 H2/PG 모두 실패함. 오늘 두 번 발생 (zone 추가 시, entrance_mood 추가 시). 해결: `data/` 폴더 삭제하고 새로 시작. 다음에 schema 변경 시 같은 패턴이면 마이그레이션 도구(Flyway/Liquibase) 도입 고려
- **다중 도서관 전환 시 코드 영향**: `User.library` (단수) 1:1 → 1:N 변경 시 수많은 service/controller 시그니처 손봐야 함. 단, `StoredBook`은 이미 user 직속이라 영향 없음 (의도적 설계)
- **확인 필요**: `AddBookModal`/`StorageDrawer`에서 책장 가득시 백엔드는 409로 거부하는데 프론트 UI에 토스트/알림 없음. 단순 alert 또는 inline error만 있음 — UX 다듬기 필요

### 컨텍스트 / 주의사항

#### 실행 방법
1. **Spring Boot**: IntelliJ Run Configuration에 환경변수 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 설정 필수. **OCR/transcription 절대 금지** (그래서 한 번 invalid_client 에러 나서 6시간 디버깅함). `chrome://settings`나 Google Console에서 직접 복사
2. **Frontend**: `cd frontend && npm install && npm run dev` → http://localhost:5173/login
3. **DB**: 기본 H2 file mode (`./data/bookmark.mv.db`). PostgreSQL 쓰려면 `--spring.profiles.active=postgres`. Docker 미설치 환경이면 H2로 충분
4. **로그인**: 반드시 [http://localhost:5173/login](http://localhost:5173/login) (NOT 8081). Google redirect URI는 Console에 `http://localhost:8081/login/oauth2/code/google`로 등록되어 있음

#### 데이터 초기화 (스키마 변경 시)
1. IntelliJ에서 Spring Boot **중지** (lock 파일 때문에 필수)
2. 프로젝트 루트의 `data/` 폴더 삭제
3. Spring Boot 재시작 → 깨끗한 스키마로 재생성, ThemeSeedRunner가 3개 테마 시드, 다음 로그인 시 User 새로 생성

#### Tailwind v4 토큰 사용법
- CSS 변수는 [frontend/src/index.css](frontend/src/index.css)의 `@theme` 블록에 정의
- JSX에서 사용: `bg-(--color-walnut-500)`, `text-(--color-ink-strong)`, `rounded-(--radius-sm)` 형태 (괄호 + CSS 변수)
- `@theme` 안에 정의된 변수는 자동으로 Tailwind 유틸리티가 됨

#### 메모리 (Claude memory file)
**중요**: Claude Code의 메모리는 PC별로 로컬에 저장됩니다 (`~/.claude/projects/<key>/memory/`). 다른 PC에서 새 Claude 세션을 시작하면 비어있는 메모리로 시작합니다.

이 프로젝트는 메모리의 **export 사본**을 [`.claude/memory/`](.claude/memory/) 디렉토리에 함께 commit합니다:
- [`.claude/memory/MEMORY.md`](.claude/memory/MEMORY.md) — 인덱스
- [`.claude/memory/project_vision.md`](.claude/memory/project_vision.md) — **북극성, v1.0 종료 조건, 비주얼 디자인, 수익화 훅, v2 다중 도서관, 창고/import 정책** 등 핵심 결정사항 전부

##### 다른 PC에서 Claude 메모리 부트스트랩하기
1. repo clone 후, Claude Code에서 이 프로젝트 디렉토리를 열기
2. 아래 한 줄로 메모리 위치를 확인 (Claude가 자동으로 알려주거나, "memory 디렉토리 어디?"라고 물어보면 됨)
3. `.claude/memory/` 의 두 파일을 그 위치(`~/.claude/projects/<해당키>/memory/`)에 복사
4. 새 Claude 세션은 자동으로 이 메모리를 로드함

또는 Claude에게 "**`.claude/memory/`의 파일들을 내 Claude 메모리에 임포트해줘**"라고 요청하면 처리해줍니다.

##### 메모리 갱신 시 동기화
Claude가 메모리(`~/.claude/.../memory/...`)를 업데이트하면, 일과 끝에 `.claude/memory/`로 export 복사해서 commit해야 다른 PC에서도 최신 상태로 이어집니다. handoff-prompt 실행 시 자동으로 점검됩니다.

#### 임시/하드코딩
- [LibraryPage.tsx](frontend/src/pages/LibraryPage.tsx)의 `PixiPlaceholder` 컴포넌트 — Pixi.js 들어오면 제거
- [domain/Bookshelf.java](src/main/java/com/google/bookmark/domain/Bookshelf.java) `maxBooks=30` 하드코딩 (의도된 컨셉, 메모리에 "효율 이유로 제거 금지" 명시됨)
- 책장 자동 분할 시 이름 suffix `(1)`, `(2)` — 다국어 가면 변경 필요
