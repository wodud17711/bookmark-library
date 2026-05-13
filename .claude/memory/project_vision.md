---
name: 북마크 도서관 프로젝트 비전
description: 이 프로젝트(bookmark)의 제품 컨셉, 핵심 UX, 차별화 포인트
type: project
originSessionId: c8d64134-59af-4f8b-b093-e58cf2ecfdf7
---
> 이 파일은 Claude Code 메모리의 export 사본입니다. 새 PC에서 작업 시작할 때
> `~/.claude/projects/<project-key>/memory/project_vision.md` 위치로 복사해두면
> 새 Claude 세션이 자동으로 이 컨텍스트를 가지고 시작합니다.
> 자세한 부트스트랩 절차는 프로젝트 루트 `HANDOFF.md` 참고.

**프로젝트**: 도서관 메타포를 적용한 북마크 관리 웹 (포트폴리오 프로젝트, 작업 경로에 "포폴" 포함)

**문제 정의**: 구글 기본 북마크는 일렬 나열식이라 많아질수록 원하는 항목 찾기가 어려움.

**컨셉**: 북마크를 책장에 꽂힌 책처럼 시각화한 도서관 인터페이스.

**북극성(North Star)**: "누군가가 내가 만든 북마크 도서관 UI를 꾸며서 공유해 올리는 그런 것." 성공 지표는 사용자 수가 아니라 **꾸며서 자랑하고 싶어지는가**. Notion/Pinterest/Tumblr/싸이월드 미니홈피 계보의 "도구가 아니라 캔버스"형.

**Why**: 단순 도구가 아니라 "잘 정리된 책장을 보면 뿌듯함을 느끼는" 정서적 보상까지. 시각/인터랙션 품질이 기능 정확성만큼 중요.

**v1.0 종료 조건 가설**: "내 도서관을 트위터/디스코드에 링크로 공유했을 때, 친구가 미리보기 이미지에 끌려 클릭하고 가입 후 자기 도서관도 꾸미기 시작한다." 입소문 1대1 전파.

---

## 확정된 정원/한도 (실제 코드에 들어감)

- **사용자당 도서관 최대 3개** (`User.MAX_LIBRARIES`)
- **도서관당 책장 최대 8개** (`Library.MAX_BOOKSHELVES`) — 평면도 좌우 4개씩 균형 위해
- **책장당 책 최대 30권** (`Bookshelf.maxBooks`)
- 책장 30권 초과 import 시 자동 분할 `(1)`, `(2)`
- 도서관 8개 초과 import 시 남는 폴더는 창고로 자동 보관
- **창고(Storage)는 사용자 단위 1:1, 무제한** — 도서관 한도 초과 데이터의 안전판

## 다중 도서관 (v1에서 구현됨)

- `User → Library` 1:N
- `User.currentLibraryId` — 어떤 도서관 보고 있는지 서버 보존
- URL: `/u/{username}/{librarySlug}` (특정 도서관) + `/u/{username}` (첫 공개 도서관 fallback)
- 각 도서관 독립 공개/비공개, 독립 테마 (책장 + 마루)
- LibrarySwitcher (헤더 dropdown)에서 전환 + 새 도서관 생성

## 모바일/태블릿 평면도 (v1에서 구현됨)

- `PortraitMode = 'phone' | 'tablet' | null` 3분기
- 폰(<600px): 9:16, 페데스탈 입구 아래로, 책장 좌우 4쌍, 프라이빗 문 76px로 축소 + 🔒 라벨
- 태블릿 portrait(<1080px && H>W): 5:7 (near-square), aisle 더 넓어짐
- 데스크톱: 16:9 그대로
- 실루엣 슬롯이 portrait면 aisle-RELATIVE (0=좌측 책장 안쪽, 1=우측 책장 안쪽), landscape면 canvas-relative 비대칭
- `orientationchange` 이벤트도 listen → 회전 시 즉시 layout 전환
- Pixi 캔버스 `touch-action: pan-y`로 모바일 페이지 스크롤 살림 (Pixi 8 기본은 none)

## OG 이미지 자동 생성 (v1에서 구현됨)

- **Phase 1 (캡처/저장/서빙)**: `Library.ogImage`(byte[], `@JdbcTypeCode LONGVARBINARY`) — 1MB 한도. 프론트가 라이브러리 변경 후 1.5s debounce → `canvas.toBlob` → `POST /api/libraries/{id}/og-image`. 데스크톱 viewport에서만 캡처 (16:9 일관성). Pixi 옵션 `preserveDrawingBuffer:true + preference:'webgl'` 강제 (검정 PNG 방지).
- **Phase 2 (SSR for crawlers)**: Spring `PublicLibraryHtmlController`가 `/u/{username}/{slug}` HTML 직접 반환 — og:title/description/image/url + twitter:card 메타 박힌 채로. `${app.spa.script-url}` env로 SPA bundle 경로 주입.
- vite UA-bypass: bot UA(Twitterbot/kakaotalk-scrap/facebookexternalhit/Discordbot 등)는 backend로 proxy, 사람은 Vite SPA로 fallthrough → 사람도 깨끗히 SPA 부트스트랩.

## 신고 시스템 + 운영자 권한 (v1에서 구현됨)

저작권법 OSP §102~103 + 정보통신망법 면책 절차 충족 위해 v1.0 필수.

- `Report` 엔티티 (libraryId/reporterUserId(nullable)/reason/details/status/createdAt)
- `ReportReason` enum: ILLEGAL/COPYRIGHT/HARASSMENT/SPAM/OTHER
- POST `/api/reports` 익명 허용 (인증 시 reporter id 저장)
- 비공개 도서관 신고는 404 (존재 leak X)
- 신고 받으면 backend log에 `[REPORT]` WARN — 운영자 모니터링용 (이메일 알림은 v2 SMTP 셋업 시)
- 푸터에 "신고하기" 텍스트 링크 (헤더는 너무 두드러져서 푸터로 — UX/미관)
- 약관 제6조의2 신설: 신고 절차, 24~48시간 처리 노력, 사전 통지 없는 비공개/삭제 권한

**7일 공개 cooldown은 시도했다가 제거** — 트래픽 0 단계에선 봇 차단 효과 없고 실 사용자 마찰만. 신고 시스템 + 운영자 모니터링이 사후 대응으로 충분. 실제 봇 보이면 그때 도입.

## 약관/방침 정적 페이지 (v1에서 구현됨)

- `/privacy` (개인정보처리방침), `/terms` (이용약관) — 한국 PIPA + 정보통신망법 대응 (Google OAuth로 PII 받기 때문에 법적 필수)
- 시행일/연락처는 페이지 상단 상수 (`OPERATOR_NAME`, `CONTACT_EMAIL`, `EFFECTIVE_DATE`)
- 현재 `jaeyoung17711@gmail.com`. 사업자 등록 정보는 결제 도입 시 추가.

## 비주얼 디자인 방향 (확정)

- **사이트 UI**: 라이트 크림 톤 (`#FAF7F2` 배경, `#2A2520` 텍스트, `#8B5A3C` 월넛 액센트) — 갤러리 벽 컨셉
- **책장 테마 3종**: Dark Walnut(기본) / Warm Pine / Industrial Frame
- **마루 테마 3종**: 크림 파인(기본) / 골든 오크 / 다크 웬지 (책장과 독립적으로 선택)
- 평면도 시점: top-down floor plan, 책장은 좌우 벽, 베스트셀러는 중앙 페데스탈, 프라이빗 룸은 하단 문, 창고는 우상단 chip
- 폰트: Pretendard 한글 sans-serif

## 평면도 시각화 (Pixi.js v8)

- 마룻바닥이 전체 캔버스를 덮는 plank 패턴
- 책장: 둥근 모서리 + 드롭 섀도 + 나무결 + 레벨 divider + 책 높이 변주
- 베스트셀러 페데스탈: 다리 + 러그 + Graphics로 그린 골드 별
- 입구: 다층 광원 + 바닥 spill (mood 색에 따라 낮=warm sun / 저녁=주황 / 밤=파랑) — soft elliptical pool
- 프라이빗 문: 패널 + 손잡이 + 그림자 (readonly에선 숨김)
- 창고 chip: 우상단 소형 chip (readonly에선 숨김)
- **사람 실루엣**: 15권당 1명, 최대 10명 — `library.id` seed로 deterministic
- `readonly` 모드: 공유 URL 뷰에서 프라이빗 문/창고 chip 숨김 + 입구 클릭 무력화

## 미래 수익화 훅 (지금 코드만 준비, 구현 X)

- BookshelfTheme + FloorTheme 둘 다 `tier` (FREE/PAID) + `priceKrw` 필드 있음
- v1.0에서는 모든 테마 `tier=FREE`
- 결제 로직/약관/PG 연동은 v2.0 이후
- 추후 후보 BM: 데코레이션 아이템(화병/식물), 도서관 배경(시간대/날씨), 특수효과

## 창고(Storage) 컨셉

- "도서관"은 큐레이션된 공간 (책장당 30권 + 도서관당 8책장 = 의도적 제약). "기록보관소"가 아님.
- 수천 권 import 사용자를 위한 안전판: 별도 `StoredBook` 엔티티 (User 직속, Library 무관)
- StoredBook은 꾸밈 정보 없음 (URL/제목/사이트명/원래 폴더 경로), 책장으로 옮길 때 Book으로 변환
- 창고는 항상 비공개
- import 흐름: "자동으로 책장 만들기" 또는 "창고로 모두" 둘 중 선택 — UI에서 둘 다 명시 표시 필수
- 8개 cap에 자동 폴백: SHELVES 모드도 한도 초과 폴더는 창고로 + warning

## Chrome 북마크 import 정책

- HTML 파일 업로드 (Chrome 내보내기 Netscape Bookmark)
- 폴더 깊이 무제한 평탄화: **책이 직접 든 폴더만 책장이 됨**, 컨테이너 폴더 무시
- 이름 충돌 시 부모 경로 자동 추가 (`자료 / 기타`)
- 30권 초과 폴더 자동 분할
- 중복 URL 감지 v1에선 X
- import 시점에 **목적지 도서관 선택 가능** (default = 현재 도서관)
- 8개 cap 초과 시 폴더 단위로 창고 우회

## 검색 (v1에 들어감)

- **창고 검색**: 창고 드로어 상단 검색 input, 클라이언트 사이드 필터 (제목/URL/사이트명/originalFolder)
- **도서관 사서 (Librarian)**: 헤더 `📖 사서` 버튼 → 모달 → 모든 도서관의 책 + 창고 검색
  - 백엔드: `GET /api/search?q=` (BookRepository.searchByUserId + StoredBookRepository.searchByUserId, JPQL LIKE)
  - 결과 그룹: 도서관별 + 창고
  - 클릭 시: 같은 도서관 → shelf로 스크롤, 다른 도서관 → switchCurrentLibrary + refetch + pendingScroll, 창고 hit → storage drawer 열기

## API 에러 메시지 정책

- 모든 ResponseStatusException은 사용자가 읽을 한국어 메시지
- `GlobalExceptionHandler` (@RestControllerAdvice)가 일관된 JSON으로 변환: `{ status, error, message, timestamp }`
- 프론트엔드 `extractApiErrorMessage(err, fallback)` 헬퍼로 모든 catch 블록에서 파싱
- 4xx로 책장 가득/도서관 가득/소유권 없음 등 상황 구체적 메시지 노출

## 전략적 포지셔닝

포트폴리오 → 씨앗 서비스 트랙. v1.0은 포트폴리오 명작으로 완결되도록 하되, 코드/데이터 모델은 차후 확장 가능하게 (REST API 우선, 영속 DB부터 사용, 인증 토큰 기반).

## How to apply (의사결정 기준)

- 기능 추가/설계 제안 시 두 질문을 통과해야 함:
  1. 도서관 메타포에 부합하는가
  2. 사용자가 꾸미고 자랑하고 싶어지는 데 기여하는가
- "효율적 도구" 관점의 단순화 제안(목록형 fallback, 용량 제한 제거 등)은 북극성과 충돌 — 효율성 이유로 컨셉 후퇴 금지
- 의도된 제약(8 책장/도서관, 30권/책장, 3 도서관/사용자)은 컨셉 일부 — 효율 이유로 풀지 말 것
- 새 폴리시 추가 시 사용자 친화적 한국어 에러 메시지 필수
- OG 이미지 자동 생성은 이 제품의 "마케팅 그 자체" — v1.0 출시 전엔 필수 (아직 미구현)

## v1.0 후순위 (의도적 제외)

Chrome 확장(직접 동기화), 갤러리/피드, 테마 마켓플레이스, 결제.

## 운영 배포 완료 (v1.0 라이브)

- 백엔드: **Railway** + managed Postgres — `bookmark-library-production.up.railway.app`
- 프론트엔드: **Vercel** — `bookmark-library-iota.vercel.app`
- repo: github.com/wodud17711/bookmark-library
- Railway는 Trial 단계 (만료 전 Hobby $5/월로 전환 예정)
- Dockerfile multi-stage(temurin 17 jdk → jre, fontconfig 포함)
- Vercel Root Directory = `frontend`. vercel.json rewrites가 backend로 forward (UA-conditional /u/* 지원)
- Google OAuth Console에 vercel.app + railway.app prod callback URI 등록됨

### OAuth 세션 쿠키 도메인 픽스 (배포 시 막혔던 핵심 이슈)

배포 후 `authorization_request_not_found` 에러로 로그인 실패. 원인은 Spring이 redirect_uri를 자기 호스트(railway.app)로 빌드 → Google 콜백이 Vercel 안 거치고 Railway 직격 → JSESSIONID 쿠키는 vercel.app 도메인이라 같이 안 옴 → Spring 세션 못 찾음.

처방: `application.yml`의 `spring.security.oauth2.client.registration.google.redirect-uri`를 `${FRONTEND_URL}/login/oauth2/code/google`로 명시 고정. 이로 인해 로컬 개발용 `http://localhost:5173/login/oauth2/code/google`도 Google Console에 등록 필요.

### Vercel rewrites 운영 정책

`/api`, `/og`, `/oauth2`, `/login/oauth2`, `/logout` 무조건 Railway forward. `/u/*`는 봇 UA만 Railway(SSR HTML), 사람은 SPA index.html. catch-all `/:path* → /index.html`로 react-router 라우트 처리.

도메인 변경 시 `frontend/vercel.json`의 `bookmark-library-production.up.railway.app` 일괄 치환 필요.

## 책 색상 customization (v1에서 구현됨, 비전 강화)

- 백엔드 `Book.coverColor` 필드 (기본 `#3D2817` 다크월넛, regex `^#[A-Fa-f0-9]{6}$` validation)
- 프론트엔드 [BookCoverPicker](../../frontend/src/components/library/BookCoverPicker.tsx) — 프리셋 8색(다크월넛/월넛/포레스트/버건디/오션/세이지/크림/차콜) + react-colorful 인라인 HexColorPicker (모바일 native picker가 첫 화면 검정으로 시작하는 혼란 회피)
- 책장 위 미니 5권 책 미리보기 (가운데가 사용자 선택 색)
- **LRU 팔레트** ([utils/bookCoverPalette.ts](../../frontend/src/utils/bookCoverPalette.ts)) — localStorage `bookmark.recentBookColors`에 8슬롯
  - 새 색 저장 시: 맨 앞 한 칸 밀어내고 맨 뒤 추가
  - 이미 있는 색: 맨 뒤로만 이동 (LRU)
  - `lastUsedColor()`로 AddBookModal default
  - DB 저장 X — per-browser preference

## 책 드래그 정렬 (v1에서 구현됨, "꾸미기 캔버스" 핵심)

자동 정렬 옵션은 의도적 제외 — 비전("꾸미고 자랑하고")은 사용자가 직접 큐레이션하는 캔버스성에 있음.

- 백엔드 `Book.position` (이미 있던 필드) + 신규 `PATCH /api/bookshelves/{id}/book-order` 배치 재정렬. 보낸 ID 집합이 shelf 현재 책 ID 집합과 정확히 일치해야 함 (stale client 방어, 409)
- 프론트엔드 `@dnd-kit/core` + `sortable` + `utilities`. **책 등 색 띠를 드래그 핸들로** (보이는 곳=잡는 곳)
- PointerSensor `distance:5` / TouchSensor `delay:250` — 책 제목 클릭은 그대로 navigation, 길게/움직이면 drag
- `rectSortingStrategy` (grid-cols-2 환경 호환). verticalListSortingStrategy 처음 쓰다가 위치 계산 어긋나서 변경
- 낙관적 UI: arrayMove → API → 실패 시 롤백
- cross-shelf drag는 v1 제외 — EditBookModal의 책장 dropdown으로 처리

## 모바일 UX 픽스 (v1에서 구현됨)

### Modal ghost-click guard

Pixi `pointertap`이 touchend 시점에 동기적으로 모달 마운트 → 백드롭이 손가락 위치에 깔림 → 브라우저 합성 click이 그 백드롭에 떨어져 즉시 닫힘. → [Modal](../../frontend/src/components/ui/Modal.tsx)에 250ms open-time guard. Pixi 경유 모달 열기 모두에 일괄 적용.

### hover-only affordance 모바일 노출

`opacity-0 group-hover:opacity-100` 패턴이 모바일 hover 없는 환경에 invisible. → `md:` 브레이크포인트로 데스크톱만 hover 게이팅, 모바일 항상 표시. 적용:
- BookRow 편집 버튼
- StorageDrawer 책 삭제(버리기) 버튼
- LibrarianModal 검색결과 navigation hint

## 로그인 페이지 안내 (v1에서 구현됨)

신규 방문자가 컨셉 모르는 문제. [LoginPage](../../frontend/src/pages/LoginPage.tsx)에 "이렇게 작동해요" 3단계 섹션 + 인라인 SVG 일러스트:
1. 북마크 → 책 (4권 책 등 다양한 색)
2. 책장 → 평면도 (도어 + 좌우 책장 + 페데스탈 미니 floor plan)
3. 도서관 → 공유 (카드 + 외부 화살표)

max-w-md → max-w-2xl로 본문 넓힘. 3컬럼은 sm: 이상.

## 개인정보 국외 이전 조항 (v1에서 구현됨, PIPA §28-8)

Google OAuth + Vercel + Railway 모두 미국 → 회원 데이터 해외 이전. PrivacyPolicyPage 6번 섹션 신설 (이전받는 자, 국가, 일시·방법, 항목, 이용 목적·보유 기간, 연락처). 거부권 + "거부 시 서비스 이용 불가능" 명시. 시행일 2026-05-06.

## 운영 안정화 완료 (2026-05-07)

- **JVM heap 안정화**: Dockerfile에 `-Xmx400m -XX:MaxMetaspaceSize=128m` 명시. Railway 컨테이너 1GB. 사용량 ~700MB 안정. OOM 사이클 픽스됨
- **세션 timeout 30일**: `server.servlet.session.timeout/cookie.max-age: 30d`. OAuth2 + Google SSO 조합으로 사실상 자동 로그인 효과
- **개발 중 알림 배너**: DevNoticeBanner 컴포넌트, "오늘 하루 보지 않기" localStorage 저장
- **모바일 UX 픽스**: Modal 250ms ghost-click guard, hover-only affordance를 md: 브레이크포인트로, 드래그 정렬 rectSortingStrategy

## 도서관별 OG 캡처 제거 (2026-05-07)

배경: `Library.ogImage byte[]` 컬럼이 도서관당 최대 1MB. 무료 PG 호스팅 한도 빠르게 채우는 주범. 모바일만 쓰는 사용자는 캡처 못 받아 디바이스 차별 발생.

처방: 백엔드 `Library.ogImage` / `ogImageUpdatedAt` 필드 + 관련 service/controller/DTO 메소드 모두 삭제. 프론트엔드 캡처 useEffect + `uploadOgImage` API + Pixi `preserveDrawingBuffer` 옵션 제거. 코드 167줄 → 18줄 감소.

DB 마이그레이션: Hibernate `ddl-auto=update`가 컬럼 drop 안 함. 운영 PG에 컬럼 그대로 남음 (앞으로 안 쓰임). 신규 PG 호스팅 마이그레이션 시 자연 정리.

사용자당 DB 사이즈: 가벼운 사용자 ~10KB / 보통 ~50KB / 꽉 채운 한도 ~570KB. 무료 PG 500MB 한도 약 7,000명 수용.

## AI 자동 태깅/요약 (v1.5, 2026-05-13 라이브)

외부 요구(포트폴리오/AI 통합 경험)에 따라 Gemini 2.5 Flash-Lite 무료 티어로 통합. 책 추가 시 동기 호출 → 한국어 태그 2~4개 + 1줄 요약 자동 생성.

**기술 스택**:
- Gemini API REST 직접 호출 (`api.anthropic.com` X — Claude Max 플랜은 API 별도 과금이라 무료 티어 있는 Gemini 선택)
- `responseSchema`로 구조화된 JSON 출력 강제
- jsoup으로 OG/title/description 추출 → 1500자 excerpt
- AiRateLimiter: per-user 10 RPM sliding window (in-memory ConcurrentHashMap)
- 모든 실패 → `AiAnalysis.empty()` 반환 → 책 생성 절대 안 막힘

**구조 (PR1+PR2 머지됨)**:
- `AiService` 인터페이스 + `GeminiAiService` 구현 → 추후 Claude/Groq 갈아끼움 단순
- `WebMetadataFetcher` jsoup 200KB 캡
- `BookService.create` → `annotateWithAi(book, user)` 호출
- `Book.tags` `@ElementCollection book_tags` + `Book.aiSummary` (512자)
- `User.aiFeaturesEnabled` (default true, `@ColumnDefault("true")` 필수 — ddl-auto=update가 NOT NULL boolean 추가하려면 DB DEFAULT 있어야 PG가 받음)
- `MeResponse` + `PATCH /api/me` → 토글
- 환경변수: `GEMINI_API_KEY` Railway Variables

**의도된 AI 미적용 경로**:
- `BookmarkImportService` (Chrome 100권 burst) — 10분+ 동기 멈춤 + Gemini RPM 한도 → PR3 비동기로 처리 예정
- `StoredBookService.move` (창고 → 책장) — 사용자가 이미 본 URL이라 가치 적음

**프론트엔드 UX**:
- AddBookModal 직후 결과 패널(태그 칩 + 한 줄 요약) — 사용자 dismiss
- LibrarySettingsModal 맨 아래 "내 계정 · AI 자동 분류" 토글 (즉시 저장, library form과 분리)
- DevNoticeBanner에 🤖 안내 한 줄 + opt-out 안내

**정책 갱신 (2026-05-13 시행)**:
- PrivacyPolicyPage §5/§6: Gemini API 위탁 + 국외 이전 (이전 항목, 거부권, 연락처)
- TermsPage 제5조의2: AI 기반 부가 기능 조항 (정확성 보증 X, 비활성화 권리)

**비용**: 트래픽 0 단계 사실상 $0. 100명/100책 ≈ 무료 한도 내. Gemini 2.5 Flash-Lite 일 30,000 RPD.

## 다음 세션 핵심 — PR3 (Import burst 비동기 + 평소 노출)

**(a) Import 비동기 AI 처리** (1일)
- `@Async` + ThreadPoolTaskExecutor로 background annotation
- BookmarkImportService에서 책 생성 후 책 ID 리스트로 비동기 job 큐잉
- 진행률: Library refetch마다 새 태그/요약 점진 등장 (폴링 불필요한 자연스러운 흐름)
- 또는 별도 endpoint `/api/books/{id}/reannotate` 운영자용

**(b) BookCard에 태그/요약 평소 노출** (반나절~1일)
- 현재 AddBookModal 직후만 보임 — 평가자가 둘러볼 때 안 보임
- BookCard hover popover 또는 책 클릭 시 디테일 modal
- 사용자 편집 (태그 수정/추가/삭제, 요약 수정)

**우선순위**: (b) 먼저 — 포폴 임팩트 1순위. (a)는 트래픽 0 단계라 당장 안 막힘.

## 보류된 미작업 — 동적 OG 이미지 생성

배경: 현재 모든 도서관이 동일한 fallback 배너 공유. SNS 공유 시 미리보기가 일반 그림 → 비전("꾸미고 자랑하고")의 SNS 확산 효과 부족.

PR3 (AI 후속) 끝낸 다음 합리적 후보. 사양 그대로 살아있음:
- 캐시: Caffeine, maxSize 500, expireAfterWrite 5분, Library/Book/Bookshelf 변경 시 evict
- 렌더: 1200×630 PNG, 텍스트 없음 (한글 폰트 의존 회피), 책 spine 5-10개(실제 coverColor) + walnut 밴드 + 크림 배경
- 캐시 헤더: `Cache-Control: public, max-age=600`
- URL 버저닝: `?v={library.updatedAt-epoch}` (SNS 캐시 회피)
- 메모리 영향: +28MB (캐시 25MB + Caffeine 라이브러리 ~3MB)
- 작업 시간: 2-3시간

구현 범위:
- 백엔드: `OgFallbackBannerProvider` → `OgBannerRenderer`로 확장 + per-library 메소드 + Caffeine 캐시 + 변경 후크
- `OgImageController`, `PublicLibraryHtmlController` 수정
- 프론트엔드/DB: 변경 없음

## 호스팅/수익화 전략 (결정 기록)

**1인 개발자 수익화 트랙 관점**:
- 호스팅 자체는 부수적 — Vercel/Railway 그대로 유지 (월 $5-10)
- 진짜 중요: 사업자등록 + 통신판매업 신고 + 토스페이먼츠 통합 + 약관 보강 (결제 도입 시)
- 한국 호스팅(NCP 등)은 매출 발생 후 회계 단순화 필요할 때
- 도메인은 한국 회사(가비아/후이즈)에서 사도 OK

**비용 추정**:
- 1-100명: 월 $5-7
- 1,000명: 월 $10-15
- 10,000명: 월 $25-50
- 데이터 모델 가벼워 인프라 비용 매우 낮음

## 운영 리듬

- **Frontend push**: Vercel 빌드 1-2분, 사용자 끊김 0 → 자주 push OK
- **Backend push**: Railway Docker 빌드 5-7분 + 컨테이너 재시작으로 모든 세션 소멸 → batch push 권장
- 백엔드 변경 누적 후 한 번에 배포로 사용자 마찰 최소화

## 현재 v1.5 검토 중

- **이름 + 도메인 변경** — "나만의 도서관" SEO 차별화 어려움. 후보: **책섬**(1순위, "내 사적 큐레이션 섬" 컨셉 직격) / **북당**(2순위, 입에 붙음) / **책뜸** / **꽂이** / **책담**. 검증 절차: whois + KIPRIS + SNS handle + 구글 검색
- **동적 OG 생성** ★ 우선순위 1 (사양 확정, 구현 대기)
- **Railway Trial → Hobby 전환** (만료 직전)
- 카카오톡/트위터 미리보기 실제 검증
- 번들 사이즈 최적화 (현재 850KB / gzip 252KB)
- 결제 시스템 + 유료 테마 (v2)
- Spring Session + Redis (v2 — 컨테이너 재시작에도 세션 유지)
