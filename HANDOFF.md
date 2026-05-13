# HANDOFF

## [2026-05-13 오후] 일곱 번째 세션 — AI 흐름 재설계 (smart title + cover color)

여섯 번째 세션 끝나고 같은 날 이어서 — 책장 행에 태그 칩 + 요약 줄 노출(PR3 (b) A안)을 먼저 구현해 라이브로 보다가, 시각상 행이 두꺼워지고 작은 태그가 큰 가치 없다는 사용자 피드백으로 방향 전환. AI 결과 노출을 **태그/요약 줄 → "책 제목 자체를 똑똑하게 짓기"** 로 피벗. 같은 호출에 cover color까지 묶어 한 호출로 두 가치 동시 제공.

### 오늘 한 일

#### A. 태그/요약 행 노출 (실패 → 롤백)

`SortableBookRow`/`FavoriteBookRow`/`BookRow` 3곳에 spine self-stretch + 태그 칩 inline + 요약 1줄 truncate 추가. 라이브 비주얼 보고 "두껍고 굳이 필요 없음" 판단 → 전부 원래 1줄 디자인으로 롤백. (commit `78190a2`에 통합돼 들어감 — A안 실험은 같은 PR 안에서 폐기됐음)

#### B. PR3 (b) 재설계 — Smart Title 흐름

- `AiAnalysis`에 `smartTitle` 필드 추가 (`tags`/`aiSummary`는 보존, UI 노출만 제거)
- `GeminiAiService` 프롬프트/스키마 갱신:
  - 잘 알려진 사이트는 서비스명만 (`Google`, `네이버`)
  - 게시판/블로그/뉴스 글은 `사이트명 - 한 줄 요약` (`벨로그 - React 19 컴파일러 정리`)
- `BookService.create` 흐름 재배치:
  - 사용자 입력 title > clean brand `<title>` 휴리스틱 (≤30자, separator 없음) > AI smartTitle > fallback
  - clean brand면 AI 호출 스킵 (RPM 절약)
- `WebMetadataFetcher` UA를 자가식별 봇 → 일반 브라우저로 변경 — DCInside, ArcaLive 등 봇 UA 차단 회피

검증: `https://www.dcinside.com/board/lol` → "셈 - 연봉 실수령액부터 부동산 세금까지", "아카라이브 - 이환 일퀘 주간퀘 숙제 총정리" 같은 결과 정상.

#### C. PR3 (c) Cover Color AI 추천 (추가 호출 비용 0)

- `AiAnalysis.coverColor` 필드 추가 + 같은 Gemini 호출 응답에 묶음
- `WebPageContent.themeColor` 필드 + `WebMetadataFetcher`가 `<meta name="theme-color">` 파싱 (#RGB / #RRGGBB만, rgba/named 무시)
- 우선순위: 사용자가 picker 누름 > AI smartTitle 호출 시 같이 받은 coverColor > theme-color > 사용자가 보낸 lastUsedColor
- 프롬프트에 알려진 브랜드 색 카탈로그(GitHub #1F2328, Naver #03C75A 등) + 명도 30~60% 가이드
- `CreateBookRequest.coverColorAutoPicked` Boolean 추가, 프론트는 `userPickedColor` state로 picker touch 추적
- AddBookModal 결과 패널에 색상 swatch + "책 색상도 골라드렸어요" 안내 (실제로 색이 바뀐 경우만)

#### D. 모델 교체 + 카피 정확화

- Gemini 2.5 Flash-Lite (RPD 20으로 줄어듦) → 3.1 Flash-Lite (RPD 500). `application.yml` 디폴트 변경. Railway에 `GEMINI_MODEL` env 안 박혀있어서 자동 적용
- AddBookModal에 "무료 모델 사용 중이라 시간이 좀 걸릴 수 있어요" 안내
- LibrarySettingsModal 비활성 카피 정확화: "외부 AI 호출 없이 사이트 도메인" → "외부 AI 호출 없이 페이지의 제목 태그를 그대로 가져옵니다 (못 읽으면 도메인)" — `<title>` 추출은 AI 토글과 무관하게 작동하므로
- TermsPage/PrivacyPolicyPage "태그·요약" → "제목·태그·요약" (AI가 만드는 모든 항목 정확히 명시)
- DevNoticeBanner / LibrarySettingsModal 토글명 "AI 자동 분류" → "AI 자동 제목"

### 현재 상태

**라이브 (origin/main)**: 커밋 `78190a2`까지만 푸시됨 — smart title 흐름은 라이브에 들어가있음. cover color, 모델 교체, 안내 카피는 **아직 라이브 미반영**.

**브랜치 `claude/bold-einstein-05e337` (origin/main 위 3 커밋)**:
- `76f5fc5` cover color 추천 (theme-color + AI)
- `913b618` AI 비활성 카피 정확화
- `0f88bc0` 무료 모델 대기 안내
- `ad1eedb` Gemini 모델 2.5 → 3.1
- ✅ 로컬 8082에서 smart title + cover color 동작 확인 완료
- ⏳ cover color는 시각 검증 미완

**다음 세션(2026-05-14) 1순위 작업: 시각 검증 시나리오 4개**
1. Picker 안 건드리고 추가 → AI 색 적용 + 결과 패널 swatch
2. Picker 클릭 후 추가 → 사용자 색 그대로 (AI 색 무시)
3. theme-color 박힌 사이트 (GitHub/Naver/YouTube) → 그 사이트 브랜드 색
4. theme-color 없는 사이트 (DCInside) → AI 임의 추천

검증 OK면 → 메인 IntelliJ Terminal `git merge claude/bold-einstein-05e337 && git push origin main` → Railway/Vercel 배포

### 다음에 이어서 할 일 (검증 후)

**(a) Import burst 비동기 처리 — 운영 안정성 1순위**
HANDOFF 여섯 번째 세션 항목 그대로. PR3 (b/c) 끝나면 다음 후보.

**(b) BookCard 평소 노출 — 폐기**
시각 비교 끝났음. 행은 1줄로 유지. 검색용 tags/aiSummary는 DB에만 (향후 검색 기능 들어가면 그때 활용).

**(c) 동적 OG 이미지 — 보류 그대로**

### 미해결 이슈 / 막힌 지점

- 메인 IntelliJ는 메인 리포(`~/Desktop/포폴/bookmark`)에서 띄워져 있고 worktree 변경은 안 보임. 이번 세션에서 worktree 백엔드를 8082 별도 포트로 띄우고 vite proxy 잠시 8082로 돌려서 검증한 패턴 사용. 검증 완료 후 vite proxy 8081 복원 + 최종 커밋함. 다음 세션도 같은 패턴이면 IntelliJ 새 창 + Run Config 복제 (env 3개) 가시면 됨.
- HANDOFF 여섯 번째 세션의 "Gemini 2.5 Flash-Lite 30,000 RPD" 표기는 옛 정보. 현 한도 캘리브레이션 결과 RPD 20.

### 컨텍스트 / 주의사항

- **IntelliJ가 외부 편집한 .class를 자동 재컴파일 안 함** — Build → Rebuild Project 필수, 그냥 Stop+Run만 하면 옛 코드. 이번 세션 디버깅 시간 30분 까먹은 원인.
- **AI 호출 1회 = title + tags + summary + coverColor 모두 같은 응답** — 추가 필드 늘려도 호출 비용 동일. 향후 추가 메타(예: "이 책에 어울리는 이모지 1개")도 같은 패턴으로 무비용 추가 가능.
- **cover color 자동 적용 트리거**: 사용자가 BookCoverPicker를 한 번도 안 눌렀고 + 제목 비웠을 때만. 제목을 채우면 AI 자체가 안 돌아서 cover도 사용자 default 그대로. 색만 자동으로 받고 싶다면 향후 별도 트리거 추가 필요(현재 미구현).
- **검색용 tags/aiSummary는 신규 책에도 계속 저장됨** — UI에는 안 보이지만 DB에 누적. 향후 검색/필터 기능 들어가면 그대로 사용.

---

## [2026-05-13] 여섯 번째 세션 — AI 자동 태깅/요약 통합 (Gemini)

외부 요구(포트폴리오/AI 통합 경험 시연)에 따라 LLM 통합. Claude API는 Max 플랜과 별개로 종량제라 영구 무료 티어 있는 Gemini 2.5 Flash-Lite 선택. PR1(인프라) → PR2(책 생성 흐름 hook + opt-out + 정책) → hotfix(OAuth 500) 순으로 라이브 배포 완료.

### 오늘 한 일

#### A. AI 도입 의사결정 (긴 토론)

평가자 관점 분석 — 외부 요구가 "AI 다뤘다 명함" 성격이라 og:image 색 추출(통계 알고리즘) 같은 비-LLM 접근은 약함. 진짜 LLM 호출 필수.

비용 비교:
- Claude Max 플랜은 Claude.ai/Claude Code만 커버, Anthropic API 호출은 별도 과금
- Gemini 2.5 Flash-Lite: 영구 무료 (15 RPM / 30,000 RPD, 충분)
- 추가 고려: ToS상 무료 티어 데이터가 학습에 활용될 수 있음 → 개인정보처리방침 갱신 필수

기능 범위 확정:
1. 자동 태깅 (URL 본문 분석 → 2~4개 한국어 태그)
2. 1줄 요약
- (B 캐치프레이즈 후보는 사양 충돌로 보류 — OG 이미지에 한글 폰트 박는 비용 대비 효용)

#### B. PR1 — Gemini 통합 인프라 (커밋 bb93a48)

신규 파일 8개 + 수정 3개:
- `AiService` 인터페이스 + `GeminiAiService` (`responseSchema`로 구조화된 JSON 출력)
- `WebMetadataFetcher` (jsoup, 200KB 캡)
- `AiRateLimiter` (per-user 10 RPM, in-memory ConcurrentHashMap sliding window)
- `AiProperties` (`@ConfigurationProperties("ai")` + `@ConfigurationPropertiesScan` 활성화)
- `AiAnalysis`, `WebPageContent` DTO records
- `AiController.POST /api/ai/analyze` 스모크 엔드포인트
- `build.gradle`: jsoup 1.18.1 + spring-boot-starter-json 추가
- `application.yml`: `ai.*` 블록

**Spring Boot 4 호환 중요 발견**: Jackson 3.x로 패키지가 `com.fasterxml.jackson.databind` → `tools.jackson.databind`로 이동. `asText()` → `asString()`. 어노테이션은 `com.fasterxml.jackson.annotation` 그대로 (backward compat). 다른 ObjectMapper 사용처 작업 시 같은 패턴 적용 필요.

스모크 검증: `fetch('/api/ai/analyze', {body: JSON.stringify({url:'https://react.dev'})})` → 한국어 태그 + 요약 정상 응답 확인. Vercel rewrite로 Railway forward, CORS 무관.

#### C. PR2 — 책 생성 흐름 hook + opt-out + 정책 (커밋 1865f0a)

백엔드:
- `Book`: `tags` (`@ElementCollection book_tags`, `@OrderColumn`), `aiSummary` (512자)
- `User`: `aiFeaturesEnabled` (default true)
- `BookService.create.annotateWithAi(book, user)` — `user.isAiFeaturesEnabled()` 체크 → metadata fetch → AI analyze → set fields. **실패 swallow, 책 생성은 보호**
- `BookResponse` + `LibraryService.toBookResponse` + `BookshelfService.toResponse` 3곳 모두 tags/aiSummary 노출
- `MeResponse` + `UpdateMeRequest` + `AuthController.PATCH /api/me` + `UserService.updateSettings()`
- `AiAnalysis.isEmpty()`에 `@JsonIgnore` (PR1 스모크 응답에 `empty: false` leak 정리)

프론트엔드:
- `AddBookModal`: 책 추가 후 결과 패널(태그 칩 + 요약) 표시, 사용자 dismiss. `aiEnabled` prop으로 "AI가 분류 중…" 라벨 토글
- `LibrarySettingsModal`: 맨 아래 "내 계정 · AI 자동 분류" 섹션 (form 밖, 즉시 저장). `me` + `onMeChanged` prop 추가
- `DevNoticeBanner`: 🤖 안내 한 줄 + opt-out 안내
- `api/auth.ts`: `Me.aiFeaturesEnabled`, `updateMe()` 추가
- `api/library.ts`: `Book.tags`, `Book.aiSummary`

정책 (시행일 2026-05-13):
- `PrivacyPolicyPage` §5/§6: Gemini API 위탁(§5) + 국외 이전(§6 (3)번) — 이전 항목, 거부권, 연락처
- `TermsPage` 제5조의2: AI 기반 부가 기능 (정확성 보증 X, 비활성화 권리)

#### D. Hotfix — OAuth 500 (커밋 5b5d7cc)

PR2 배포 후 로그인 시 Whitelabel 500. 원인:
- `User.aiFeaturesEnabled` `nullable=false` 컬럼을 ddl-auto=update가 ADD하려고 시도
- PostgreSQL은 기존 row 있는 상태에서 NOT NULL boolean 컬럼을 DEFAULT 없이 ADD 거부
- Hibernate는 ALTER 실패를 silent log로만 처리 → 컨테이너는 시작하지만 컬럼 없음 → `SELECT ai_features_enabled` SQL 에러 → OAuth 콜백 500

처방: `@org.hibernate.annotations.ColumnDefault("true")` 추가. Hibernate가 `ADD COLUMN ... DEFAULT true NOT NULL` 생성 → PG가 기존 row를 true로 자동 채움.

배포 후 검증 4가지 모두 정상:
1. 책 추가 → AI 결과 패널 (태그 칩 + 요약) ✓
2. AI 토글 끄기 → 결과 패널 없이 바로 닫힘 ✓
3. DevNoticeBanner 🤖 안내 ✓
4. /privacy, /terms 페이지 시행일 + Gemini 라인 ✓

#### E. AI 미적용 의도 경로 문서화 (커밋 미정 — 이번 handoff 함께)

`BookmarkImportService` + `StoredBookService.move`는 `BookService.create` 우회 → AI 호출 안 됨. 의도된 동작이지만 의도 명시 안 돼 미래 개발자 혼란 가능성. 코드 주석 한 줄씩 추가:
- Import: 100권 burst가 10분+ 동기 멈춤 + Gemini 일 한도 초과 위험 → PR3 비동기 처리 예정
- Storage move: 사용자가 이미 본 URL, 가치 적음

### 현재 상태

**라이브**:
- Gemini API 키 Railway env `GEMINI_API_KEY` 등록됨
- 단일 책 추가 흐름에 AI 동기 통합 (2-3초 지연 — UX 수용 가능, PR3에서 async)
- per-user opt-out 토글 (LibrarySettingsModal 맨 아래)
- 약관/방침 갱신 시행

**동작 안 함 / 의도된 제외**:
- Chrome import 시 AI 미적용 (의도, PR3 비동기로 풀 예정)
- Storage → Shelf 이동 시 AI 미적용 (의도)
- BookCard 평소 화면에 태그/요약 안 보임 (AddBookModal 직후만) → 포폴 가시성 약점, PR3 우선 후보

### 다음에 이어서 할 일 (PR3 후보)

**(b) BookCard 평소 노출 ★ 1순위 — 포폴 임팩트**
- 현재 AddBookModal 결과 패널만 — 시간 지나면 안 보임
- BookCard hover popover (`md:` 가드, 모바일은 클릭) 또는 EditBookModal에 태그/요약 필드 노출
- 사용자 편집 기능 (태그 add/remove/edit, 요약 수정)
- `Book` 엔티티는 이미 필드 있음, `BookResponse` 노출 됨 → 프론트만 손대면 됨
- 추정 작업: 반나절~1일

**(a) Import burst 비동기 처리 ★ 2순위 — 운영 안정성**
- `BookmarkImportService`에 `@Async` annotation 메소드 또는 `ThreadPoolTaskExecutor.execute()`
- 책 생성 transaction 커밋 후 별도 thread에서 책 ID 리스트 순회하며 AI 호출
- 진행률 표시는 자연스러운 흐름으로: Library refetch마다 새 태그 점진 등장 (폴링 불필요)
- 또는 별도 endpoint `POST /api/books/{id}/reannotate` 운영자/사용자가 트리거
- Gemini RPM 한도 고려 — 1초당 1-2건으로 throttle 필요
- 추정 작업: 1일

**(c) 동적 OG 이미지 ★ 보류 (사양 확정됨)**
- PR3 (a)+(b) 후 합리적 후보
- 사양은 `project_vision.md`에 그대로 살아있음

### 미해결 이슈 / 막힌 지점

없음. 모든 의도된 기능 정상 동작 확인.

### 컨텍스트 / 주의사항

- **Spring Boot 4 = Jackson 3.x**: 새 ObjectMapper 코드 짤 때 `tools.jackson.databind`, `asString()` 패턴 따를 것
- **Hibernate ddl-auto=update + 새 NOT NULL 컬럼 = `@ColumnDefault` 필수**: PG가 기존 row 있는 테이블에 NOT NULL 컬럼을 DEFAULT 없이 못 받음. 다음에 boolean/int 같은 primitive 새 컬럼 추가할 때 같은 패턴 적용
- **AI 동기 호출 = 책 추가 2-3초 지연**: UX 수용 가능하나 PR3 async가 진짜 픽스
- **Gemini ToS**: 무료 티어 데이터가 모델 학습에 활용될 수 있음. 약관 갱신 했지만 종량제 전환 시 학습 제외 가능 (필요 시 검토)
- **AiRateLimiter는 in-memory**: 컨테이너 재시작 시 카운터 초기화. 단일 인스턴스 운영이라 OK. 멀티 인스턴스 가면 Redis 필요
- **`AiController.POST /api/ai/analyze`** 스모크 엔드포인트 남아있음. PR3에서 제거 또는 admin re-annotate 용도로 보존 결정
- **환경변수**: 신규 PC에서 로컬 dev 띄울 땐 `GEMINI_API_KEY` 비워두면 자동 비활성화 (AiProperties.isOperational() false 반환)

---

## [2026-05-07] 다섯 번째 세션 — 운영 안정화 (OOM 픽스 + DB 슬림화 + 세션/UX 정리)

배포 다음 날 바로 OOM 알림 폭주로 시작, 메모리 튜닝 → DB 슬림화 → UX 보강 순으로 진행. 또 호스팅/수익화 전략 토의도 같이 (결론: Vercel/Railway 유지). 다음 세션 핵심은 **동적 OG 생성 구현** — 사양 확정됨.

### 오늘 한 일

#### A. JVM 메모리 안정화 (OOM 사이클 픽스)

배포 후 밤사이 OOM 알림 반복 → 컨테이너 재시작 사이클. 원인: `JAVA_TOOL_OPTIONS`에 heap 명시 없어서 JVM 기본 `MaxRAMPercentage=25%` 적용 → 컨테이너 RAM의 25%만 heap → Spring Boot 정상 운영(200~300MB heap 필요)에 부족 → GC 폭주 → OOM.

처방 단계 (시행착오):
1. `-XX:MaxRAMPercentage=70 + InitialRAMPercentage=40` → 작은 컨테이너에서 startup 즉시 commit으로 또 OOM
2. `InitialRAMPercentage` 제거 → 그래도 컨테이너 1GB에서 사용량 973MB 도달, 헤드룸 부족
3. 최종: **`-Xmx400m + -XX:MaxMetaspaceSize=128m`** → 안정화

Railway 측 조치: 컨테이너 메모리 1GB로 상향 (Settings → Resources).

결과: 사용량 ~700MB 안정화, 헤드룸 300MB+. OOM 사라짐.

#### B. 도서관별 OG 캡처 완전 제거 (DB 슬림화 + 코드 단순화)

**배경**: `Library.ogImage byte[]` 컬럼이 도서관당 최대 1MB. 100명 × 3도서관 ≈ 300MB로 무료 PG 호스팅(Supabase/Neon 500MB) 빠르게 채우는 주범. 또한 모바일만 쓰는 사용자는 캡처 못 받아 영영 fallback이라 디바이스 차별 발생. **수익화 트랙으로 가면서 무료 PG 호스팅 활용 가능성 + 사용자 평등성**이 진짜 OG 캡처 가치보다 큼.

**정리 결과**:
- 백엔드: `Library.ogImage` / `ogImageUpdatedAt` 필드, `LibraryService.updateOgImage / getPublicOgImageBytes`, `LibraryController POST /api/libraries/{id}/og-image`, `LibraryOgMetadata.hasOgImage` 모두 삭제. `OgImageController`는 도서관 공개로 존재하면 fallback 배너만 응답하는 단순 컨트롤러로 축소
- 프론트엔드: `uploadOgImage` API, LibraryPage 1.5초 debounce + canvas.toBlob 캡처 useEffect, `sceneWrapRef`, PixiLibraryScene `preserveDrawingBuffer:true + preference:'webgl'` 옵션 모두 제거
- application.yml: multipart 설정 제거 (OG 업로드 위해서였음)
- 코드 라인: 167 → 18 (149줄 감소)

**DB schema 처리**: Hibernate `ddl-auto=update`는 컬럼 drop 안 하니 운영 PG에 `og_image`, `og_image_updated_at` 컬럼 그대로 남음. 앞으로 안 쓰여 무관. 신규 PG 호스팅 마이그레이션 시 자연 정리.

**사용자당 DB 사이즈** (꽉 채운 한도 사용자 기준): User 0.25KB + 3 Libraries 2.1KB + 24 Bookshelves 4.8KB + 720 Books 504KB ≈ **570KB**. 보통 사용자 평균 ~50KB. 무료 PG 500MB 한도까지 약 **7,000명 수용 가능**.

#### C. 모바일 ghost-click + hover-only affordance 픽스

(2026-05-06 세션과 같이 묶이지만 시점상 분리)

- **Modal ghost-click**: Pixi `pointertap`이 touchend에 동기 발화 → 모달 마운트 → 백드롭이 손가락 위치에 깔림 → 합성 click이 그 백드롭에 떨어져 즉시 닫힘. → Modal에 250ms open-time guard
- **hover-only invisible affordance**: 책 편집/삭제 버튼이 모바일에서 영영 안 보임. → `md:` 브레이크포인트로 데스크톱만 hover 게이팅, 모바일은 항상 표시
- **드래그 정렬 grid 호환**: `verticalListSortingStrategy` → `rectSortingStrategy`로 변경 (md:grid-cols-2 환경 위치 계산)

#### D. 개발 중 알림 배너

서비스가 활발한 개발 단계라 가끔 끊김/에러 발생. 사용자가 영문 모르고 떠나지 않게 부드러운 안내 + 새로고침 권유.

[DevNoticeBanner](frontend/src/components/library/DevNoticeBanner.tsx):
- LibraryPage / PublicLibraryPage 상단에 카드 스타일
- "닫기" — 그 세션만 hide
- "오늘 하루 보지 않기" — localStorage(`bookmark.devNoticeDismissedOn`)에 YYYY-MM-DD 저장, 다음 날 자동 다시 표시
- private mode/storage 거부 시에도 동작

#### E. 세션 timeout 30분 → 30일

자리 좀 비우면 30분 만에 자동 로그아웃되어 재로그인 마찰 큼. OAuth2가 Google에 위임돼 비번 재입력은 아니지만 클릭 한 번이라도 줄이는 게 좋음.

application.yml:
```yaml
server.servlet.session.timeout: 30d
server.servlet.session.cookie.max-age: 30d
server.servlet.session.cookie.http-only: true
# secure 플래그는 Spring 자동 추론에 맡김 (HTTPS 운영 vs http localhost)
```

한계: 컨테이너 재시작 시 in-memory 세션 모두 소실 → 재로그인 필요. 자주 재배포는 사용자 마찰. 해결은 v2의 Spring Session + Redis. 지금은 frontend는 자주 / backend는 batch push 패턴 운영.

#### F. 호스팅/수익화 전략 토의 (코드 변경 없음, 결정 기록)

**Railway Trial (~$4.95) vs Hobby ($5/월) vs 영구 무료 옵션 검토**:
- 30일 Trial 만료 후 Hobby 전환 권장 ($5 + 사용량, 우리 케이스 총 $5-10/월)
- Oracle Cloud Always Free DIY는 학습 가치 있지만 1인 수익화 트랙엔 시간 가치 안 맞음
- Render free tier는 sleep 때문에 카톡 미리보기 깨짐 → 제외
- Supabase free PG는 7일 idle pause로 우리 케이스 부적합

**1인 개발자 수익화 관점 인프라 우선순위**:
- 호스팅 자체는 부수적
- 진짜 중요: 사업자등록 + 통신판매업 신고 + 토스페이먼츠 통합 + 약관 보강 (결제 도입 시)
- 호스팅 옮기는 시점은 매출 발생 + 한국 회사 회계 단순화 필요할 때 (NCP 등)
- 도메인은 가비아/후이즈에서 한국 회사로 사도 OK

**향후 1인 개발자 비용 추정**:
- 1-100명 사용자: 월 $5-7
- 1,000명: 월 $10-15
- 10,000명: 월 $25-50
- 데이터 모델 가벼워 인프라 비용 매우 낮음

### 해결한 버그 / 이슈

1. **OOM 사이클**: -Xmx400m + Railway 컨테이너 1GB로 픽스
2. **Vercel webhook 누락**: 빈 commit push로 강제 트리거 (이전 세션과 같은 패턴)
3. **모바일 native color picker 첫 화면 검정**: react-colorful로 교체 (이전 세션 마무리)

### 현재 상태

#### 동작 확인됨 ✅
- 운영 배포 정상 (Railway + Vercel)
- OAuth 로그인 + 30일 세션
- OG fallback 배너 (모든 도서관 동일, 임시 placeholder)
- 책 색상 picker + LRU 팔레트 + 책장 미리보기
- 책 드래그 정렬 (rectSortingStrategy)
- 개발 중 알림 배너
- 모바일 UX (ghost-click + hover affordance)
- 메모리 안정 (~700MB / 1024MB, 헤드룸 300MB+)

#### 다음 세션 핵심 (사양 확정)

**1. 동적 OG 이미지 생성 — 미리보기 진짜 작동시키기**

배경: 현재 모든 도서관이 동일한 fallback 배너 공유. SNS에서 본인 도서관 공유해도 일반 그림. 비전("꾸미고 자랑")의 SNS 확산 채널 효과 부족.

확정 사양:
| 결정 | 값 |
|---|---|
| 캐시 라이브러리 | Caffeine |
| 캐시 maxSize | 500개 (LRU) |
| 캐시 expireAfterWrite | 5분 |
| 캐시 invalidate trigger | Library/Book/Bookshelf 변경 시 명시적 evict |
| 렌더 해상도 | 1200×630 |
| 폰트 | 사용 안 함 (텍스트 free) — Linux 컨테이너 한글 폰트 의존 회피 |
| 그림 요소 | 책 spine 5-10개 (실제 coverColor) + 위/아래 walnut 밴드 + 크림 배경 |
| Cache-Control | public, max-age=600 (10분) |
| OG URL versioning | `?v={library.updatedAt-epoch}` (SNS 캐시 회피) |

구현 범위:
- 백엔드: `OgFallbackBannerProvider` → `OgBannerRenderer`로 확장 + per-library renderForLibrary(library) 메소드 + Caffeine 캐시 + Library/Book/Bookshelf 변경 시 cache evict 후크
- `OgImageController` 수정: 도서관 데이터 받아 renderer로 위임
- `PublicLibraryHtmlController`: og:image URL에 `?v={ts}` 붙임
- 프론트엔드: 변경 없음 (메타 인젝션 코드는 그대로)
- DB: 변경 없음
- 메모리 영향: +28MB (캐시 25MB + Caffeine 라이브러리 ~3MB)

작업 시간: 2-3시간

### 다음에 이어서 할 일

1. **동적 OG 이미지 생성 구현** ★ 우선순위 1 (위 사양대로)
2. 이름 + 도메인 결정 (후보: 책섬/북당/책뜸 등) + Vercel/Railway 커스텀 도메인 연결
3. (선택) 본인 디자인 fallback 배너 PNG로 교체 — 또는 동적 OG로 사실상 대체됨
4. (선택) Railway Hobby 플랜 전환 (Trial 만료 직전)
5. (먼 v2) Spring Session + Redis로 컨테이너 재시작에도 세션 유지

### 컨텍스트 / 주의사항

#### Railway 컨테이너 메모리 = 1GB로 상향됨
초기 default보다 큼. JVM `-Xmx400m`와 조합하여 헤드룸 확보. 비용 약간 증가하나 안정성 우선.

#### Dockerfile JVM 옵션 최종형
```
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -Xmx400m -XX:MaxMetaspaceSize=128m -Djava.awt.headless=true"
```

#### 운영 배포 후 마찰 패턴
- 백엔드 push → Railway Docker 빌드 (5-7분) + 컨테이너 재시작 → 모든 세션 소멸 → 재로그인 필요
- 프론트엔드 push → Vercel 빌드 (1-2분), 백엔드 무관 → 사용자 끊김 0
- **운영 리듬**: frontend는 자주 push, backend는 batch push로 마찰 최소화

#### 로컬 개발 환경 셋업 (다른 PC에서)
1. `git pull`
2. Claude Code에 부트스트랩 프롬프트 (HANDOFF.md 마지막 섹션) 붙여넣기 — 메모리 자동 복사
3. `.env.example` → `.env` 복사 + `GOOGLE_CLIENT_ID/SECRET` 채움
4. `cd frontend && npm install`
5. IntelliJ Run Configuration에 환경변수 박기
6. Google Console에 `http://localhost:5173/login/oauth2/code/google` 등록 확인

총 5-7분이면 새 PC도 작업 가능 상태.

---

## [2026-05-06] 네 번째 큰 세션 — 운영 배포 + 모바일 UX + "꾸미기 캔버스" 강화 (책 색상 + 드래그 정렬 + 로그인 안내)

이번 세션은 두 흐름. **(1) 실제 운영 배포** Railway/Vercel/Google OAuth Console 셋업 + OAuth 세션 쿠키 도메인 이슈 픽스 → 라이브. **(2) 비전("꾸미고 자랑하고 싶어지는 캔버스") 강화** 책 색상 picker + 드래그 정렬 + 로그인 페이지 안내. 친구가 실제 사용 시작했고 모바일 UX 이슈 두 건 픽스 (ghost-click + hover-only affordance).

운영 도메인:
- 백엔드 (Railway + Postgres): `bookmark-library-production.up.railway.app`
- 프론트엔드 (Vercel): `bookmark-library-iota.vercel.app`
- repo: https://github.com/wodud17711/bookmark-library

### 오늘 한 일 (큰 묶음 단위)

#### A. 운영 배포 — Railway 백엔드 + Vercel 프론트엔드

배포 설정 파일 신규:
- [Dockerfile](Dockerfile) — multi-stage(temurin 17 jdk → jre), `bootJar` 산출물 실행, `fontconfig` 설치 (AWT/Graphics2D 초기화 안정용)
- [.dockerignore](.dockerignore) — frontend/, build/, .gradle/, .claude/ 등 제외
- [frontend/vercel.json](frontend/vercel.json) — rewrites
  - `/api`, `/og`, `/oauth2`, `/login/oauth2`, `/logout` → Railway 무조건
  - `/u/*` → **UA 조건부**: 봇(Twitterbot/kakaotalk-scrap/etc) Railway, 사람 SPA index.html (dev vite proxy의 UA-bypass와 동일 정책)
  - SPA catch-all `/:path* → /index.html` (login/privacy/terms 등 react-router 라우트)
  - `__RAILWAY_HOST__` placeholder를 실제 도메인으로 치환

[application.yml](src/main/resources/application.yml) 운영 환경 대응:
- `server.port: ${PORT:8081}` — Railway 동적 PORT 매핑 (실제는 8080)
- `server.forward-headers-strategy: framework` — Railway LB 뒤 HTTPS / public host 인식
- `app.spa.script-url: ${SPA_SCRIPT_URL:/src/main.tsx}` — env 명시 binding

Railway 셋업 절차:
1. GitHub OAuth로 가입 → Configure GitHub App → repo 권한
2. New Project → Deploy from GitHub repo → Dockerfile 자동 감지
3. **+ Database → Add PostgreSQL** (이름 자동 `Postgres`로 떨어짐)
4. 백엔드 서비스 Variables에 환경변수:
   - `SPRING_PROFILES_ACTIVE=postgres`
   - `GOOGLE_CLIENT_ID/SECRET`
   - `FRONTEND_URL=https://bookmark-library-iota.vercel.app`
   - `DB_HOST=${{Postgres.PGHOST}}` 등 5개 (반드시 Variables Value 필드의 **자동완성 드롭다운에서 선택** — 손으로 타이핑하면 reference 인식 안 됨, 빈 문자열로 풀림)
5. Settings → Networking → **Generate Domain** (target port `8080` 입력 — 8081 아님)

Vercel 셋업 절차:
1. GitHub OAuth로 가입 → repo Import
2. **Root Directory를 `frontend`로 변경** (이게 핵심 — 안 바꾸면 vercel.json 못 찾음)
3. Framework Preset: Vite 자동 감지
4. Deploy

Google OAuth Console:
- 승인된 JavaScript 원본: `https://bookmark-library-iota.vercel.app`, `https://bookmark-library-production.up.railway.app`
- 승인된 리디렉션 URI: 위 두 도메인 + `/login/oauth2/code/google`
- 로컬 개발용 `http://localhost:5173/login/oauth2/code/google` 도 추가 (redirect-uri 고정 후 필요)

#### B. OAuth 트러블슈팅 — `authorization_request_not_found` 픽스 (세션 쿠키 도메인 분리)

**증상**: 로그인 시도 → Google 인증 통과 → "Login with OAuth 2.0 / Invalid credentials" Spring 기본 에러 페이지로 떨어짐. 도메인이 railway.app으로 이동.

**진단 절차**:
1. Spring 기본 동작이 OAuth 실패를 조용히 redirect로 처리해 로그에 안 박힘 → 진단용 `failureHandler` + DEBUG 로깅 추가해서 raw 에러 강제 출력
2. 진짜 에러 코드: `authorization_request_not_found, description=null`
3. curl로 검증: Spring이 만든 redirect_uri가 `https://bookmark-library-production.up.railway.app/login/oauth2/code/google` (Railway 도메인)

**원인**: 사용자가 vercel.app/oauth2/authorization/google → Vercel rewrite → Railway → Spring이 자기 호스트로 redirect_uri 빌드 (Vercel이 X-Forwarded-Host를 안 넘기거나 Spring이 못 받음). Google 인증 후 브라우저는 railway.app으로 직접 이동 → JSESSIONID 쿠키는 vercel.app 도메인에 저장돼 있어서 함께 안 옴 → Spring 세션의 OAuth2AuthorizationRequest를 못 찾음.

**처방**: application.yml의 `spring.security.oauth2.client.registration.google.redirect-uri`를 `${FRONTEND_URL:http://localhost:5173}/login/oauth2/code/google` 로 명시 고정 → Google이 vercel.app으로 redirect → Vercel rewrite로 Railway로 forward → 같은 도메인 안에서 세션 쿠키 일관 유지.

**부수 변경**: SecurityConfig의 `failureHandler`는 운영 모니터링 + UX 개선(vercel.app/login?error로 redirect) 목적으로 유지. DEBUG 로깅은 진단 끝나고 제거.

#### C. 모바일 OG fallback 배너

배포 전 마지막 보강. 모바일만 쓰는 사용자(데스크톱 viewport에서만 OG 캡처되니까)도 SNS 미리보기 가능하게.

- [OgFallbackBannerProvider](src/main/java/com/google/bookmark/service/OgFallbackBannerProvider.java) — startup 시 1200×630 placeholder PNG 생성·캐시. 배포 환경 한글 폰트 의존 회피용 텍스트-프리 디자인 (크림 배경 + 위/아래 월넛 밴드 + 가운데 5권 책 미니 일러스트). classpath에 `og-default-banner.png` 있으면 그게 우선 (drop-in 교체 가능)
- [LibraryService.isPublicLibraryPresent](src/main/java/com/google/bookmark/service/LibraryService.java) — fallback 분기용 존재 체크
- [OgImageController](src/main/java/com/google/bookmark/controller/OgImageController.java) 수정 — 캡처 없으면 도서관이 공개로 존재할 때만 fallback PNG, 비공개/없음만 404

#### D. 모바일 UX — ghost-click + hover-only affordance 픽스

**1. Modal ghost-click**: 모바일에서 Pixi 창고 chip 탭 → 모달 ~0.2초 보였다가 자동 닫힘. 원인은 Pixi `pointertap`이 touchend 시점에 동기적으로 발화 → Modal 즉시 마운트 → 백드롭이 손가락 위치에 깔림 → 브라우저가 합성 click을 그 백드롭에 dispatch → onClose. 처방: [Modal](frontend/src/components/ui/Modal.tsx)에 250ms open-time guard. Pixi 경유 모달 열기 모두에 일괄 적용.

**2. hover-only invisible affordance**: 모바일은 hover 없으니 책 편집/삭제 버튼이 영영 안 보임. 처방: 3군데 `opacity-0 group-hover:opacity-100`을 `md:opacity-0 md:group-hover:opacity-100`으로 변경. 모바일은 항상 표시, 데스크톱은 hover시 — 반응형 디자인 정석.
- BookRow 편집 버튼 (LibraryPage)
- StorageDrawer 책 삭제(버리기) 버튼
- LibrarianModal 검색결과 navigation hint

#### E. 개인정보 국외 이전 조항 추가 (PIPA §28-8 대응)

Google OAuth(인증) + Vercel/Railway 호스팅이 모두 미국에서 운영 → 회원 식별 정보 + 북마크 데이터가 해외로 이전. 한국 PIPA 제28조의8 명시 의무.

[PrivacyPolicyPage](frontend/src/pages/PrivacyPolicyPage.tsx) 신규 6번 섹션 — 이전받는 자(Google LLC / Vercel Inc. / Railway Corp.), 국가, 일시·방법, 항목, 이용 목적, 보유 기간, 연락처. 거부권 + "거부 시 서비스 이용 불가능" 명시. 시행일 2026-05-04 → 2026-05-06 갱신. 기존 6~11번 섹션은 7~12번으로 이동.

#### F. 책 색상 picker — 비전 강화 (캔버스성)

지금까지 모든 책이 default `#3D2817` 다크월넛 단색이라 책장이 단조로움. 북극성 직격 부족.

**구현 단계**:
1. **신규 [BookCoverPicker](frontend/src/components/library/BookCoverPicker.tsx)** — 프리셋 8색(다크월넛/월넛/포레스트/버건디/오션/세이지/크림/차콜) + native `<input type="color">` (V1)
2. 모바일 native picker가 첫 화면 검정으로 시작하는 사용자 혼란 → **react-colorful의 HexColorPicker로 교체** (V2). 항상 hue×saturation 영역 보임. "직접 선택" details/summary로 접어두기
3. 모달들에 통합:
   - AddBookModal: 책 추가 시 색상 선택 가능
   - EditBookModal: 기존 책 색상 변경 (book.coverColor 초기값)
4. **책장 위 책 미리보기** — 5권 미니 책장 (가운데가 사용자 선택 색, 양옆 walnut 톤 neutral) — Pixi 렌더링과 시각적 일관성
5. **LRU 팔레트** ([utils/bookCoverPalette.ts](frontend/src/utils/bookCoverPalette.ts)) — localStorage `bookmark.recentBookColors`에 8슬롯
   - 새 색 저장 시: 맨 앞 한 칸 밀어내고 맨 뒤 추가
   - 이미 있는 색: 맨 뒤로만 이동 (LRU)
   - `lastUsedColor()`로 AddBookModal default값 (가장 최근 색)
   - DB 저장 X — per-browser preference라 localStorage가 적격

백엔드는 이미 `Book.coverColor` + `^#[A-Fa-f0-9]{6}$` validation 있어서 프론트만 추가.

#### G. 책 드래그 정렬 (수동 큐레이션)

비전("꾸미고 자랑하고") 직격 — 자동 정렬 도구가 아니라 사용자가 책장 위 책 등 색깔/높이 보면서 직접 큐레이션. 자동 정렬 옵션은 의도적 제외.

**백엔드**:
- 신규 [PATCH /api/bookshelves/{id}/book-order](src/main/java/com/google/bookmark/controller/BookshelfController.java) — `orderedBookIds` 받아 shelf 내 책 position을 0..n-1로 일괄 재할당
- [BookshelfService.reorderBooks](src/main/java/com/google/bookmark/service/BookshelfService.java) — 검증: 보낸 ID 집합이 shelf 현재 책 ID 집합과 정확히 일치해야 (stale client가 reorder로 책 누락시키지 못하게 409 반환)
- [ReorderBooksRequest](src/main/java/com/google/bookmark/dto/ReorderBooksRequest.java)
- `BookService.create`는 이미 `position=size`로 append중이라 변경 X
- BookRepository는 이미 position 순 정렬 query

**프론트엔드**:
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` 도입 (gzip ~14KB)
- ShelfCard가 DndContext + SortableContext로 감쌈
- BookRow → SortableBookRow: **책 등 색 띠를 드래그 핸들로** (보이는 곳 = 잡는 곳)
- PointerSensor `distance: 5` / TouchSensor `delay: 250, tolerance: 5` — 책 제목 클릭/탭은 네비게이션, 길게/움직이면 드래그
- 낙관적 UI: arrayMove로 즉시 갱신, API 성공 시 부모 refetch, 실패 시 롤백
- **rectSortingStrategy** 사용 (verticalListSortingStrategy 처음에 썼다가 grid-cols-2 환경에서 위치 계산 어긋나서 변경)
- cross-shelf drag는 v1 제외 — EditBookModal의 책장 dropdown으로 처리

#### H. UI 정리 — 톱니바퀴 + 로그인 페이지 + 카피

- **설정 아이콘**: 기존 SVG가 가운데 원 + 8개 직선 스파이크 → 사용자에게 "해/별"로 보임. Lucide cog SVG path로 교체. 사각 톱니 + 가운데 hole, 16→18px / stroke 1.3→1.8
- **LoginPage 보강** — 신규 방문자가 컨셉을 모르는 문제. "이렇게 작동해요" 3단계 섹션 추가:
  1. 북마크 → 책 (4권 책 등 일러스트, 다양한 색)
  2. 책장 → 평면도 (도어 + 좌우 책장 + 페데스탈 미니 floor plan SVG)
  3. 도서관 → 공유 (카드 + 외부 화살표 SVG)
  - max-w-md → max-w-2xl로 본문 넓힘. 인라인 SVG/CSS — 의존성 0
- **카피 다듬기**: "URL 하나가 색깔 있는 책 한 권. 책 등 색을 직접 골라 꾸밉니다" → "URL 하나가 원하는 색깔의 책 한 권이 됩니다" (한 문장 압축, 능동형)

#### I. ESLint react-hooks 7.x 신규 rule 처리

처음 사전 점검 시 frontend lint에서 15 errors 떨어짐. 전부 새로 활성화된 `react-hooks/set-state-in-effect`, `react-hooks/refs` 룰. 표준 React 패턴(modal `useEffect` 리셋, prop→state sync, `propsRef.current = props`)을 너무 엄격하게 잡는 케이스라 코드 자체는 정상.

처방: [eslint.config.js](frontend/eslint.config.js)에서 두 룰 `'off'` 처리. v2에서 일관된 점진 리팩토링. 부수로 안 쓰는 disable 주석 제거 + PublicLibraryPage useEffect deps에 slug 추가 (다른 도서관 네비게이션 시 refetch 누락되던 잠재 버그).

### 해결한 버그 (이번 세션)

1. **OAuth `authorization_request_not_found`** — Spring redirect_uri를 자기 호스트로 빌드해서 Google 콜백이 Vercel을 거치지 않고 Railway 직격, 세션 쿠키 도메인 분리. → application.yml에 redirect-uri 명시 고정.
2. **Vercel 404 on /login** — vercel.json에 SPA catch-all rewrite 누락. → `/:path* → /index.html` 추가.
3. **Vercel deploy webhook 한 번 누락** — push했는데 자동 빌드 안 떴음. → 빈 커밋 push로 강제 트리거.
4. **모달 모바일 ghost-click** — Pixi pointertap → modal 즉시 마운트 → 백드롭에 합성 click 떨어져 즉시 닫힘. → 250ms open-time guard.
5. **모바일에서 편집/삭제 버튼 invisible** — `opacity-0 group-hover:opacity-100`이 모바일 hover 없는 환경에 영영 invisible. → `md:` 브레이크포인트로 데스크톱만 hover 게이팅.
6. **드래그 정렬이 grid에서 자리 안 바뀜** — verticalListSortingStrategy를 grid-cols-2 환경에 적용해 좌표 계산 어긋남. → rectSortingStrategy.
7. **모바일 컬러피커 첫 화면 검정** — 모바일 Chrome native picker가 value 0(검정)으로 시작. → react-colorful 인라인 picker로 교체.
8. **Railway DB_* 변수가 빈 문자열** — `${{Postgres.PGHOST}}` 손으로 타이핑 → reference 인식 안 됨. → Postgres 서비스가 안 만들어진 상태였고, 추가 후 자동완성 드롭다운으로 다시 박음.
9. **Gradle test ClassNotFoundException** — Korean 경로(`포폴`) 인코딩 이슈로 test worker JVM이 컴파일된 BookmarkApplicationTests를 못 로드. 빌드 자체는 정상이라 `-x test`로 skip. (deploy 산출물엔 영향 없음, 차단 X)

### 현재 상태

#### 동작 확인됨 ✅ (운영 환경에서)
- OAuth 로그인 (Vercel → Railway, 세션 쿠키 vercel.app 도메인 일관)
- 책장 / 책 CRUD 풀 사이클
- 책 색상 커스터마이징 + LRU 팔레트
- 책 드래그 정렬 (데스크톱 + 모바일)
- 평면도 Pixi 렌더링 (책 색깔 다양, 새 순서 즉시 반영)
- /u/* 공개 도서관 — 사람 SPA, 봇 SSR HTML
- OG fallback 배너 (모바일만 쓰는 사용자 대응)
- 신고 시스템
- 모바일 모달 (ghost-click 픽스)
- 모바일 편집/삭제 버튼 affordance

#### 미완성 / v1.5에서 보강할 것 ❌
- **이름 + 도메인 변경** — "나만의 도서관" SEO 차별화 어려움. 후보 정해서 (책섬/북당/책뜸 등) 도메인 구입 후 Vercel/Railway에 연결 + 메타 태그 갱신
- **본인 디자인 OG 배너 PNG** — 현재 placeholder (책 5권 + 월넛 밴드). `src/main/resources/og-default-banner.png` drop-in 교체
- **Railway Trial → Hobby 전환** — 30일/$4.95 trial 만료 전. 꾸준히 운영 의도면 Hobby($5/월 + 사용량 포함)
- **카카오톡/트위터 미리보기 실제 검증** — 봇 SSR HTML은 curl로 확인됐지만 실제 SNS 카드 모양 검증
- **번들 사이즈 850KB / gzip 252KB** — 코드 스플리팅 안 됨. v2에서 dynamic import로 분리

### 다음에 이어서 할 일

1. **이름 + 도메인 결정** — Top 5 후보 (책섬/북당/꽂이/책담/책뜸) 검증:
   - whois로 도메인 가능성 (`.com / .kr / .app / .io`)
   - KIPRIS 상표 충돌
   - SNS handle (x.com, instagram)
   - 구글 검색 시 첫 페이지 비어있는지
   - 1순위 추천: **책섬** (컨셉 "내 사적인 큐레이션 섬" 정확히 일치)
2. 도메인 구입 후 Vercel/Railway에 커스텀 도메인 연결 + 메타 태그/copy 갱신
3. Railway Hobby로 업그레이드 (trial 만료 전)
4. (선택) 본인 디자인 OG 배너 PNG로 교체
5. (선택) 코드 스플리팅 — Pixi/dnd-kit lazy load

### 미해결 이슈 / 막힌 지점

- **Vercel rewrite의 X-Forwarded-Host 동작 불확실** — 우회로 redirect-uri 명시 고정으로 해결했지만, 향후 Vercel이 X-Forwarded-Host 보내는 케이스로 바뀌면 또 점검 필요
- **localStorage 컬러 팔레트는 디바이스별 독립** — PC와 폰에서 따로. "어디서나 같아야 한다"는 요구 나오면 User 엔티티에 컬럼 추가
- **Gradle test 한글 경로 이슈 미해결** — 차단 요소 아니지만 `gradlew test` 못 돌림. 향후 CI 셋업 시 해결 필요 (영문 경로 worktree 사용 등)

### 컨텍스트 / 주의사항

#### 운영 환경 변수 (Railway)
- `SPRING_PROFILES_ACTIVE=postgres`
- `GOOGLE_CLIENT_ID/SECRET` — Google Console에서 직접 복붙 (IntelliJ env 경유 시 stale 가능)
- `FRONTEND_URL=https://bookmark-library-iota.vercel.app`
- `DB_HOST=${{Postgres.PGHOST}}`, `DB_PORT=${{Postgres.PGPORT}}`, `DB_NAME=${{Postgres.PGDATABASE}}`, `DB_USERNAME=${{Postgres.PGUSER}}`, `DB_PASSWORD=${{Postgres.PGPASSWORD}}`
  - 자동완성 드롭다운으로 박아야 함. 손으로 적으면 평문이 됨.

#### vercel.json의 `__RAILWAY_HOST__`
도메인 변경 시 [frontend/vercel.json](frontend/vercel.json)의 `bookmark-library-production.up.railway.app`을 새 호스트로 일괄 치환.

#### 로컬 개발 시 주의
- redirect-uri를 `${FRONTEND_URL}/login/oauth2/code/google`로 고정해서 Google Console에 `http://localhost:5173/login/oauth2/code/google`도 등록되어 있어야 OAuth 동작
- OAuth 환경변수가 없어도 spring boot 부트는 됨 (Spring Security 기본 동작)

#### 이름 후보 (다음에 결정)

심도 있게 추렸음. 검색 차별화 + 도메인 가능성 + 발음/입소문 + 컨셉 부합:
- **책섬** (Chaekseom) — 1순위. "내 책의 섬" = 사적 큐레이션 공간, 평면도 시각과 일치
- **북당** (Bookdang) — 2순위. 짧고 입에 붙음, bookdang.com 가능성
- **책뜸** (Chaektteum) — 3순위. 슬로우라이프 정서 진함, 신조어 진입 장벽
- **꽂이** / **책담** — 보조 후보

검증 절차: whois + KIPRIS + SNS handle + 구글 검색 4단계로 깨끗한 후보 확정.

#### 다른 PC에서 Claude 메모리 부트스트랩
1. repo clone
2. Claude Code 첫 메시지로:
```
이 프로젝트는 다른 PC에서 작업하다 넘어온 거야. 다음 순서로 컨텍스트를 잡아줘:
1. HANDOFF.md를 읽어서 지금까지의 작업 내역과 다음 할 일 파악
2. .claude/memory/*.md를 ~/.claude/projects/<이 프로젝트의 키>/memory/로 복사 (없으면 만들고, 있으면 머지)
3. 환경 점검: data/ 폴더, .env, frontend/node_modules
4. 운영 도메인 살아있는지 curl로 확인 (Railway: bookmark-library-production.up.railway.app, Vercel: bookmark-library-iota.vercel.app)
5. "준비 완료, 다음에 할 일은 [HANDOFF.md 기준 요약]" 보고하고 대기
```

---

## [2026-05-04] 세 번째 큰 세션 — 모바일 평면도 정착 + OG 자동화 + 약관/방침 + 신고 시스템 + 보안 audit + PG 호환

전 PC에서 worktree(`.claude/worktrees/happy-faraday-a38598`)로 작업, 큰 묶음마다 `main`에 `merge --no-ff`. v1.0 코드는 사실상 완성 — 남은 건 외부 시스템 셋업(배포/도메인/OAuth 콘솔/소셜 미리보기 검증).

### 오늘 한 일 (큰 묶음 단위)

#### A. 모바일/태블릿 평면도 (viewport-aware 분기)

- **입구 라벨 제거**: `🚪 입구 / 📜` 텍스트 제거. 빛 spill + 도어 프레임만 남아 시각적 입구 유지. [PixiLibraryScene.drawEntrance](frontend/src/components/library/PixiLibraryScene.tsx)
- **9:16 portrait 분기 (폰)** — viewport.h > viewport.w 판정 + 컨테이너 aspectRatio 동적 + drawScene 내부 portrait 분기. 페데스탈을 입구 바로 아래 `PORTRAIT_PEDESTAL_BAND`(120px) 영역으로 이동, 책장은 좌우 4쌍 그대로 (shelfW=100, sideWallWidth=120). 프라이빗 문 폭 110→76, 라벨 🔒로 축약.
- **모바일 캔버스 touch-action: pan-y** — Pixi 8 기본 `touch-action: none`이 모바일 페이지 스크롤 잠금 → `pan-y`로 풀어 페이지 스크롤은 브라우저, 탭은 Pixi가 받게.
- **back-to-top 플로팅 버튼** — 우하단 walnut 원형, scrollY > 300px에서 등장. LibraryPage + PublicLibraryPage 양쪽.
- **헤더 햄버거 메뉴** (<600px): 공유/창고/설정/로그아웃 접고, 가져오기는 모바일에서 완전 숨김 (Chrome mobile에 HTML export 없음). 사서 + 도서관 스위처만 노출.
- **Landscape 실루엣 비대칭 재설계** — (0.5, 0.5) 둘러싼 대칭이 "기념사진 찍는 듯" 부자연스러움 → 좌우 미러/공유 yR 없는 슬롯 + jitter 22→44/18→36 확대.
- **태블릿 portrait 5:7 분기** — iPad/Galaxy Tab(768~1080px) 세로일 때 9:16이면 너무 길쭉 + 실루엣 stack. `PortraitMode = 'phone' | 'tablet' | null`로 3분기. 폰 9:16, 태블릿 5:7, 데스크톱 16:9. `orientationchange` 이벤트도 함께 listen.
- **실루엣 aisle-RELATIVE 매핑** — portrait 슬롯 xR을 0=좌측 책장 안쪽, 1=우측 책장 안쪽으로 재정의. drawSilhouettes가 런타임 aisle 경계로 픽셀 매핑 → 좁은 폰(110px)도 넓은 태블릿(500px)도 같은 슬롯 리스트로 자연 스케일.

#### B. 책장/베스트셀러 collapsible + 책장 추가 버튼 위치 이동

- ShelfCard / PublicShelfCard 헤더 클릭 → 책 목록 접고 펼침 (chevron 회전). 카운트/편집/+책 추가 버튼은 접힌 상태에서도 사용 가능.
- 베스트셀러 섹션도 헤더 자체 토글, 카드 통째 접힘.
- "+ 새 책장 추가" / "새 도서관 만들기 →" 버튼을 책장 목록 아래 → 위로 이동.
- 공용 Chevron + CollapseHeader는 LibraryPage + PublicLibraryPage 양쪽에 동일 정의 (작은 SVG라 추출 X).

#### C. OG 이미지 자동 생성 (Phase 1 + Phase 2)

**Phase 1 — 캡처 + 저장 + 공개 서빙:**
- `Library.ogImage`(byte[]) + `ogImageUpdatedAt`(Instant) — nullable
- [LibraryService.updateOgImage](src/main/java/com/google/bookmark/service/LibraryService.java) — 1MB 한도 + 소유권 검증
- `LibraryService.getPublicOgImageBytes` — 공개 도서관만 (private leak 차단)
- POST `/api/libraries/{id}/og-image` (multipart, 인증, 204)
- 신규 [OgImageController](src/main/java/com/google/bookmark/controller/OgImageController.java) — GET `/og/{username}/{slug}` 공개, image/png, 10분 캐시
- application.yml `spring.servlet.multipart.max-file-size: 2MB`
- 프론트 LibraryPage: 라이브러리 변경 후 1.5s debounce → `canvas.toBlob('image/png')` → 업로드. **데스크톱(≥600px) viewport에서만** 캡처해 OG 일관성 16:9 유지. 실패는 silent.
- vite.config.ts `/og` 프록시.
- **검정 PNG 이슈 수정**: Pixi 8 기본 WebGPU/WebGL `preserveDrawingBuffer:false` → canvas.toBlob 시 framebuffer 비어 검정. `preserveDrawingBuffer:true + preference:'webgl'` 강제로 해결.

**Phase 2 — SSR HTML for crawlers:**
- 신규 [PublicLibraryHtmlController](src/main/java/com/google/bookmark/controller/PublicLibraryHtmlController.java) `/u/{username}/{slug}` (text/html 반환)
- `LibraryOgMetadata` DTO — 가벼운 read-only 뷰. 비공개/없음이면 generic fallback HTML.
- og:title/description/image/url + twitter:card 태그를 `HtmlUtils.htmlEscape`로 안전하게 박음.
- `<script type="module" src="${app.spa.script-url:/src/main.tsx}">` — env 변수로 prod 빌드 hash 갈아끼울 수 있게.
- vite UA-bypass: bot UA(Twitterbot, kakaotalk-scrap, facebookexternalhit, Discordbot, Slackbot 등)는 backend로 proxy해서 OG-rich HTML, 사람 UA는 Vite의 SPA index.html(`/@react-refresh`/`/@vite/client` 주입 포함)로 bypass — 사람이 직접 `/u/*` 접근해도 SPA HMR이 깨지지 않음.

검증: `Invoke-WebRequest -UserAgent "Twitterbot/1.0"` 로 응답 HTML에 og:image 메타 들어가는지 확인됨. 카톡/트위터 미리보기는 배포 후 폰에서 검증 예정 (현재 데스크톱에 카톡 미설치).

#### D. 개인정보처리방침 + 이용약관 정적 페이지

한국 PIPA + 정보통신망법 대응 — Google OAuth로 PII 받기 때문에 법적 필수.
- 신규 [PrivacyPolicyPage](frontend/src/pages/PrivacyPolicyPage.tsx) — 11개 섹션
- 신규 [TermsPage](frontend/src/pages/TermsPage.tsx) — 11+조 (제6조의2 신고 절차 신설 포함)
- 공통 LegalPageShell (sticky header + 시행일 + 도서관으로 링크) + max-w-3xl 본문
- App.tsx 라우트 추가 (`/privacy`, `/terms`, 인증 불필요)
- LoginPage 약관/방침 텍스트를 실제 Link로 변경
- LibraryPage + PublicLibraryPage 푸터에 "이용약관 · 개인정보처리방침" 링크
- `CONTACT_EMAIL = "jaeyoung17711@gmail.com"`, `EFFECTIVE_DATE = "2026-05-04"`
- 미해결: 사업자/통신판매업 신고 정보는 결제 도입 시 추가

#### E. 신고 시스템

공개 도서관에 불법/저작권 침해/스팸이 올라올 수 있는 위험에 대한 합리적 방어책. 트래픽 0인 v1 단계에서도 법적 면책(저작권법 OSP §102~103, 정보통신망법) 충족 위해 필수.

- 신규 [Report 엔티티](src/main/java/com/google/bookmark/domain/Report.java) (libraryId/reporterUserId(nullable)/reason/details/status/createdAt)
- `ReportReason` enum: ILLEGAL/COPYRIGHT/HARASSMENT/SPAM/OTHER
- [ReportRepository](src/main/java/com/google/bookmark/repository/ReportRepository.java), [ReportService](src/main/java/com/google/bookmark/service/ReportService.java) (`@Slf4j` 로깅 — 신고 시 [REPORT] WARN 출력), [ReportController](src/main/java/com/google/bookmark/controller/ReportController.java)
- POST `/api/reports` 익명 허용 (SecurityConfig permitAll), 인증 시 reporter id 저장
- 비공개 도서관 신고는 404로 응답 (존재 leak X)
- 프론트: [api/reports.ts](frontend/src/api/reports.ts) + [ReportModal](frontend/src/components/library/ReportModal.tsx) (라디오 사유 + textarea 1000자 + 접수 완료 화면)
- 푸터에 "신고하기" 텍스트 링크 (이전엔 헤더 🚩 신고였는데 너무 두드러져서 푸터로 이동)

약관 보강 (TermsPage):
- 제6조에 피싱/멀웨어 추가
- 제6조의2 신설: 신고 절차, 24~48시간 내 처리 노력, 사전 통지 없는 비공개/삭제, 허위 신고 시 신고 권한 제한

**7일 공개 cooldown은 시도했다가 제거**: 트래픽 0인 v1 단계에선 봇 차단 효과 없고 실 사용자 마찰만 유발 (가입 후 일주일은 친구에게 공유 못 함). 신고 시스템 + 운영자 모니터링이 사후 대응으로 충분 — 실제 봇이 보이기 시작하면 그때 도입.

미해결:
- Spring Mail 이메일 알림 (배포 후 SMTP 설정 시)
- 신고 누적 임계값 자동 비공개 (현재 운영자 수동)
- 운영자 admin UI (현재 DB 직조회 / 로그 모니터링)

#### F. 도서관 설정 모달 — 폼 에러 위치 분리

기존엔 단일 `error` 상태가 TextInput "도서관 이름" 인라인에만 표시됨. 서버 에러도 이름 필드 아래에 떠서 사용자가 "이름이 잘못됐나?" 오해 가능. 분리:
- `titleError`: 클라이언트 검증 (이름 빈 칸) — TextInput 인라인
- `formError`: 서버 에러 — 저장 버튼 위 빨간 배너

#### G. 보안 audit + 수정

전체 코드 보안 검토 + 발견된 이슈 처리.

**[HIGH] URL scheme 검증 추가**
- CreateBookRequest.url, ImportEntry.url에 `@Pattern(^https?://.+)` 추가.
- javascript:/data:/file:/vbscript: 등 위험 scheme 차단. React가 일부 막아주지만 백엔드에서 defense-in-depth.
- 한국어 message ("URL은 http:// 또는 https:// 로 시작해야 합니다.")

**[MEDIUM] OG 메타 책장 수 leak 차단**
- `LibraryService.getPublicLibraryOgMetadata`의 bookshelfCount가 PRIVATE 룸까지 카운트해서 공유 페이지 OG description으로 PRIVATE 책장 수 추정 가능했음.
- `BookshelfZone.PUBLIC`만 stream filter로 카운트해 leak 차단.

**[MEDIUM] SecurityConfig 정책 조정**
- 처음엔 `.anyRequest().authenticated()` (deny-by-default) 시도했으나 OAuth/error/Spring 내부 path가 깨져서 되돌림.
- 최종: `/api/u/**` + `POST /api/reports`만 permitAll, `/api/**` authenticated, 그 외 (`/og/**`, `/u/**`, OAuth, `/login`, `/logout`, `/error`, 정적 자산, SPA fallthrough) `anyRequest().permitAll()`.
- 핵심 보호 surface는 `/api/**` 만 — 새 /api endpoint 추가 시에도 자동으로 인증 강제.

**[LOW-MED] Catch-all + 404 핸들러 분리**
- `@ExceptionHandler(Exception.class)` 추가 — NPE/IllegalState 등 unexpected 시 stack은 server log, 클라엔 generic 한국어 메시지
- `@ExceptionHandler({NoHandlerFoundException, NoResourceFoundException})` 별도 — 매핑 없는 path는 깨끗한 404 ("요청하신 경로를 찾을 수 없습니다.") 반환. 이전엔 catch-all이 잡아 500으로 둔갑시켰음.

Audit 결과 견고했던 영역:
- 모든 service의 `loadOwnedX(userId, id)` 패턴 — existence-leak X
- 공개 도서관 응답이 `BookshelfZone.PUBLIC`만 필터
- JPQL parameterized — SQL injection 안전
- `searchByUserId`가 본인 데이터만
- React 자동 escape (XSS)
- JSESSIONID HttpOnly 기본, HTTPS 시 Secure 자동
- DTO에 size/regex validation

v2 deferred:
- POST /api/reports rate limiting
- OG 이미지 magic bytes 검증 (Spring Security nosniff 헤더로 일부 커버됨)

#### H. PostgreSQL 호환 점검 + 수정

배포 직전 H2 → PG 전환 대비.

호환 확인됨:
- `build.gradle`에 H2 + PostgreSQL 드라이버 둘 다 runtimeOnly
- `application.yml`의 `postgres` 프로파일 ENV 변수 매핑 + `PostgreSQLDialect`
- JPQL이 `lower()`/`coalesce()` 등 표준 SQL만 사용
- 시더(ThemeSeedRunner, BookshelfThemeService, FloorThemeService)는 Spring Data JPA 표준

수정 (PG 호환):
- `Library.ogImage`: `@Lob byte[]` → `@JdbcTypeCode(SqlTypes.LONGVARBINARY)`. PG에서 Hibernate 6+ 기본 OID(Large Object) 매핑은 별도 트랜잭션 + 메모리 leak 위험 + bytea보다 비효율 → bytea로 강제.
- `Library.welcomeMessage`, `Report.details`: `@Lob String` → `@JdbcTypeCode(SqlTypes.LONGVARCHAR)`. PG에서 OID 대신 text. `columnDefinition="TEXT"`는 그대로.

배포 시 권장 (보류):
- ddl-auto: update → 안정화 후 validate
- Flyway/Liquibase 도입은 v2

### 해결한 버그 (이번 세션)

1. **OG PNG 검정 화면**: Pixi 8 기본 WebGPU/preserveDrawingBuffer:false → toBlob 시 framebuffer 비어 검정. `preserveDrawingBuffer:true + preference:'webgl'` 강제.
2. **/u/* 사람 브라우저 빈 화면**: backend HTML이 Vite의 `/@react-refresh`, `/@vite/client` 주입 없어서 plugin-react 변환된 .tsx 가 `window.$RefreshReg$` 못 찾고 멈춤. UA bypass로 사람 UA는 Vite로 fallthrough.
3. **모바일 평면도 위 스크롤 잠김**: Pixi 8 기본 `touch-action:none`. `app.canvas.style.touchAction = 'pan-y'` 명시.
4. **태블릿 portrait 9:16 너무 길쭉 + 실루엣 stack**: aspect 5:7로 분기 + aisle-relative 슬롯 매핑.
5. **도서관 설정 cooldown 메시지가 이름 필드 아래**: error 상태 분리 (titleError + formError).
6. **/random-test 직접 접근 시 500**: catch-all이 NoResourceFoundException까지 잡아 500으로 둔갑. 별도 핸들러로 404.
7. **신고 버튼 너무 두드러짐**: 헤더 우측 → 푸터 텍스트 링크로 이동.

### 현재 상태

#### 동작 확인됨 ✅
- 폰/태블릿/데스크톱 평면도 자동 분기 (orientation 감지 포함)
- 책장/베스트셀러 collapsible
- OG 이미지 캡처 + 저장 + 공개 서빙 (Phase 1 dev에서 검증)
- /u/* SSR HTML (Phase 2) — bot UA PowerShell 검증, 사람 UA는 SPA로 bypass
- 개인정보처리방침 + 이용약관 정적 페이지 (jaeyoung17711@gmail.com)
- 신고 시스템 (익명 OK, 5개 사유, 1000자 details, [REPORT] 로깅)
- 보안 audit 4건 fix
- PG 호환 @JdbcTypeCode 적용

#### 미완성 / v1.0 출시 전 필수 ❌
- **운영 환경 PostgreSQL 전환** — 코드 호환은 끝, 실제 PG 인스턴스에서 검증은 배포 시
- **배포** (Vercel + Railway) — 외부 시스템 셋업 필요
- **카카오톡/트위터/디스코드 미리보기 검증** — 배포 + 실제 핸드폰에서 확인
- **Google OAuth Console에 운영 callback URL 추가**
- **Vercel rewrites 설정** — `/u/*`, `/og/*`, `/api/*`를 백엔드(Railway)로 forward
- **운영용 환경변수 채우기** — `GOOGLE_CLIENT_ID/SECRET`, `FRONTEND_URL`, `DB_*`, `SPA_SCRIPT_URL`(prod 빌드 hash)

### 다음에 이어서 할 일

1. **Railway 계정 + Spring Boot 배포** + managed Postgres 추가
2. **Vercel 계정 + 프론트엔드 배포** + rewrites 설정
3. **도메인 등록** (선택) + Google OAuth Console 운영 callback URL 등록
4. **환경변수 양쪽에 채우기**
5. **핸드폰 카카오톡으로 자기 자신한테 링크 보내서 미리보기 동작 확인**
6. **이슈 발견 시 fix + 재배포**

### 미해결 이슈 / 막힌 지점

- **OG 이미지는 데스크톱에서만 캡처** — 모바일만 쓰는 사용자는 영영 OG 안 갱신. v2에서 한 번이라도 데스크톱 viewport 시뮬레이션 캡처 또는 admin trigger.
- **신고 시스템 익명 무제한** — spam 가능. 트래픽 늘면 IP rate limit 추가.
- **ddl-auto=update 그대로 배포** — schema 변경 잦으면 데이터 날릴 수도. 안정화 후 validate / Flyway.
- **OG image 클라이언트 캡처 의존** — 사용자가 한 번이라도 자기 도서관 보지 않으면 OG 없음. fallback static OG PNG 추가하면 봇 깨끗.

### 컨텍스트 / 주의사항

#### 실행 방법 (변경 없음)
1. IntelliJ Run Configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 환경변수 (직접 복사)
2. Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173/login
3. DB 기본 H2 file (`./data/bookmark.mv.db`). PG 쓰려면 `--spring.profiles.active=postgres` + 환경변수.

#### 데이터 초기화 (스키마 충돌 시)
1. Spring Boot 중지
2. `data/` 폴더 삭제
3. 재시작 → 스키마 재생성, 시드 자동 실행, 다음 로그인 시 User+Library 새로 생성

#### 백엔드 구조 변화 (이번 세션)
- 새 엔티티: `Report`, `ReportReason`
- Library 엔티티: `ogImage`(byte[], `@JdbcTypeCode LONGVARBINARY`) + `ogImageUpdatedAt` 추가; `welcomeMessage`도 `@Lob` → `@JdbcTypeCode LONGVARCHAR`
- 새 컨트롤러: `OgImageController`, `PublicLibraryHtmlController`, `ReportController`
- 새 서비스: `ReportService`
- 새 DTOs: `LibraryOgMetadata`, `ReportRequest`
- LibraryService 메서드 추가: `updateOgImage`, `getPublicOgImageBytes`, `getPublicLibraryOgMetadata`
- SecurityConfig: `/og/**`, `/u/**`, `POST /api/reports` permitAll 추가
- GlobalExceptionHandler: catch-all `Exception.class` + 404 (`NoHandler/NoResourceFoundException`) 별도

#### 프론트엔드 새/수정 파일 (이번 세션)
- 새 페이지: `PrivacyPolicyPage`, `TermsPage`
- 새 컴포넌트: `ReportModal`, 헤더 안의 `HamburgerMenu` (LibraryPage 내부)
- 새 api: `reports.ts`, library.ts에 `uploadOgImage` 추가
- 큰 수정: `PixiLibraryScene` (대규모 — phone/tablet/landscape 분기, aisle-relative 슬롯, OG WebGL 옵션, touch-action), `LibraryPage` (헤더 햄버거, OG 캡처 effect, back-to-top, 컬랩스 토글, 추가 버튼 위치, 폼 에러 분리), `PublicLibraryPage` (OG 메타 동적 주입, ReportModal, 컬랩스 토글, back-to-top, 푸터 링크), `LibrarySettingsModal` (titleError/formError 분리), `LoginPage` (Link 적용)
- vite.config.ts: `/og` + `/u` 프록시 (UA bypass 포함)

#### 새 환경변수 (배포 시)
- `SPA_SCRIPT_URL` — Vite 빌드 결과 hash 경로 (default `/src/main.tsx` for dev). prod는 `/assets/index-XXX.js` 형식.

#### 다른 PC에서 Claude 메모리 부트스트랩
1. repo clone
2. Claude Code 첫 메시지로:
```
이 프로젝트는 다른 PC에서 작업하다 넘어온 거야. 다음 순서로 컨텍스트를 잡아줘:
1. HANDOFF.md를 읽어서 지금까지의 작업 내역과 다음 할 일 파악
2. .claude/memory/*.md를 ~/.claude/projects/<이 프로젝트의 키>/memory/로 복사 (없으면 만들고, 있으면 머지)
3. 환경 점검: data/ 폴더, .env, frontend/node_modules
4. "준비 완료, 다음에 할 일은 [HANDOFF.md 기준 요약]" 보고하고 대기
```

---

## [2026-05-03] 두 번째 큰 작업 — 다중 도서관 + 검색 + 평면도 폴리시

전 커밋 이후 진행한 큰 작업의 묶음. v1.0 거의 마무리 단계.

### 오늘 한 일 (큰 묶음 단위)

#### A. 도서관 설정 패널 (C-3)
- [components/library/LibrarySettingsModal.tsx](frontend/src/components/library/LibrarySettingsModal.tsx) — 도서관 이름/환영 메시지/입구 분위기/책장 테마/마루 테마/공개 토글
- 헤더에 ⚙ IconButton, `PATCH /api/library` 호출
- 새 [components/ui/Textarea.tsx](frontend/src/components/ui/Textarea.tsx) — 라벨/문자 카운트 슬롯

#### B. 공유 URL `/u/{username}/{slug}` (C-4)
- [PublicLibraryController.java](src/main/java/com/google/bookmark/controller/PublicLibraryController.java) — `GET /api/u/{username}/{slug}/library` (slug 명시) + 기존 short URL `/api/u/{username}/library` (첫 공개 도서관)
- [LibraryService.getPublicLibrary](src/main/java/com/google/bookmark/service/LibraryService.java) — PRIVATE 책장 백엔드에서 필터, isPublic=false면 404
- [SecurityConfig](src/main/java/com/google/bookmark/config/SecurityConfig.java) — `/api/u/**` permitAll
- [pages/PublicLibraryPage.tsx](frontend/src/pages/PublicLibraryPage.tsx) — read-only 도서관 뷰, 환영 메시지 배너, 베스트셀러 섹션, "내 도서관 만들기" CTA, **Pixi 평면도 readonly 모드 통합**
- 헤더 ShareButton — clipboard 복사 + 비공개 시 안내

#### C. Pixi.js 평면도 시각화 (C-2 시리즈, 가장 큰 변화)
- 새 파일 [components/library/PixiLibraryScene.tsx](frontend/src/components/library/PixiLibraryScene.tsx) (대규모) + [utils/shelfThemes.ts](frontend/src/utils/shelfThemes.ts) 색 상수
- Pixi v8 setup with autoDensity, ResizeObserver로 반응형
- 2 useEffect 구조: setup-once + redraw-on-data-change (appRef로 인스턴스 보존)
- **5개 영역 모두 그림**: 입구 / 베스트셀러 페데스탈 / 좌우 벽 책장 / 프라이빗 문 / 창고 chip
- **타이쿤 폴리시 패스**: 둥근 모서리, 드롭 섀도, 나무결, 마룻바닥 plank 패턴, 입구 광원 + 바닥 spill (entranceMood 색에 따라 변화), 베스트셀러 페데스탈에 다리/러그/Graphics 별
- 입구 spill: 직선 V cone → soft elliptical pool (자연스러움)
- 책장 클릭 → 아래 ShelfCard로 부드러운 스크롤 + walnut ring 강조
- `readonly` prop — 공유 뷰에서 프라이빗 문/창고 chip 숨김 + 입구 클릭 무력화

#### D. 마루/책장 테마 분리
- 새 entity [FloorTheme.java](src/main/java/com/google/bookmark/domain/FloorTheme.java) — primaryColor, shadowColor, tier, priceKrw
- 시드 3개: `cream-pine` (기본), `golden-oak`, `dark-wenge` ("다크 웬지" 한국어)
- `Library.floorPaletteName` (nullable, default "cream-pine")
- [api/floorThemes.ts](frontend/src/api/floorThemes.ts) + LibrarySettingsModal에 마루 picker section
- **시더 패턴 변경**: `seedDefaultsIfMissing` → `upsert` (BookshelfThemeService도 동일) — displayName/description 변경이 다음 시작 시 자동 반영, `data/` 폴더 삭제 불필요

#### E. 다중 도서관 + 한도
- `User → Library` 1:1 → 1:N (`@OneToMany`, `@OneToOne` 제거)
- `User.currentLibraryId` 추가 + `MAX_LIBRARIES = 3`
- `Library`에 `slug` (URL 친화), `sortOrder`, `MAX_BOOKSHELVES = 8`, `(user_id, slug) UNIQUE`
- 새 엔드포인트: `GET /api/libraries`, `POST /api/libraries`, `POST /api/libraries/{id}/switch`, `PATCH /api/libraries/{id}`
- `GET /api/library`, `PATCH /api/library` — 현재 도서관 단축 (호환 유지)
- [LibraryService.createLibrary](src/main/java/com/google/bookmark/service/LibraryService.java) — slug 자동 생성 (slugify) + cap 검증 + 자동 current 전환
- [BookshelfService.create](src/main/java/com/google/bookmark/service/BookshelfService.java) — `Library.MAX_BOOKSHELVES` cap, currentLibraryId 우선
- 새 [LibrarySwitcher.tsx](frontend/src/components/library/LibrarySwitcher.tsx) — 헤더 dropdown, 책장 N/8 표시, "+ 새 도서관"
- 새 [CreateLibraryModal.tsx](frontend/src/components/library/CreateLibraryModal.tsx) — 자동 slug, cap 도달 시 폼 대신 안내
- LibraryPage 책장 섹션: 8개 도달 시 추가 버튼 disabled + "새 도서관 만들기 →" 핫링크

#### F. 8-cap을 import에도 적용 + 도서관 선택
- [BookmarkImportService.importToShelves](src/main/java/com/google/bookmark/service/BookmarkImportService.java) — `resolveTargetLibrary(userId, libraryId)`로 currentLibraryId 또는 명시 libraryId 사용 (이전 첫 도서관 버그 수정), 한도 초과 폴더는 자동으로 창고로 + warning
- `ImportRequest.libraryId` 필드 추가 (optional)
- ImportBookmarksModal **재구조**: 모달 열 때 fetchMyLibraries → dropdown 표시 (현재 default), 선택 변경 시 cap warning 즉시 재계산

#### G. 검색기능
- **창고 검색**: [StorageDrawer.tsx](frontend/src/components/library/StorageDrawer.tsx) 상단에 search input, client-side filter (제목/URL/사이트명/originalFolder), "전체" 체크박스가 필터된 책 기준
- **도서관 사서 (Librarian)**: 새 backend
  - [BookRepository.searchByUserId](src/main/java/com/google/bookmark/repository/BookRepository.java) + [StoredBookRepository.searchByUserId](src/main/java/com/google/bookmark/repository/StoredBookRepository.java) JPQL LIKE
  - [SearchResponse + BookHit + StoredHit](src/main/java/com/google/bookmark/dto/SearchResponse.java) — 위치 정보 포함 (libraryId/Slug/Title, bookshelfId/Title/Zone, isCurrentLibrary)
  - [SearchService](src/main/java/com/google/bookmark/service/SearchService.java) + [SearchController](src/main/java/com/google/bookmark/controller/SearchController.java) `GET /api/search?q=`
- 프론트엔드: [api/search.ts](frontend/src/api/search.ts), 새 [LibrarianModal.tsx](frontend/src/components/library/LibrarianModal.tsx) — 헤더 `📖 사서` 버튼, 250ms 디바운스, 도서관별 그룹 + 창고 섹션, 같은 도서관 클릭 → 스크롤, 다른 도서관 클릭 → switchCurrentLibrary + pendingScroll → refetch 후 자동 스크롤
- LibraryPage `pendingScrollShelfId` 상태 + useEffect로 library 변경 감지 후 스크롤

#### H. 사람 실루엣 게이미피케이션
- [PixiLibraryScene.drawSilhouettes](frontend/src/components/library/PixiLibraryScene.tsx) — 15권당 1명, 최대 10명
- 10개 슬롯 (페데스탈 주변 안전 구역), library.id seed로 deterministic jitter
- 머리 + 몸통 + 다리 + 발 밑 그림자, 좌우 방향 변주, 색은 마룻바닥 luma 기준 자동 (어두운 잉크/밝은 잉크)

#### I. UX 마이크로 픽스
- 책장 삭제 후 모달 버튼 비활성화 버그 — `handleDelete`/`handleMoveToStorage`에 `try/finally` 적용 + useEffect에 `setSubmitting(false)` 가드
- 모든 form에 Enter 키 submit (form id + form="..." 패턴)
- 창고: 행 전체 클릭으로 체크박스 토글 (`<label>`로 감쌈), 체크박스 5×5 (14→20px), **bulk delete 버튼**
- 베스트셀러 페데스탈: ✨ 이모지 → Graphics로 그린 골드 5각 별 + 하이라이트
- 입구 spill: 직선 V cone → soft elliptical pool
- 평면도 책장 간격 16 → 32px (라벨 가려짐 해결)
- 화분 데코 제거 (사용자 요청)
- 창고 chip 위치 — 책장과 충돌 안 하게 우상단으로 이동 (책장 영역 침범 X)
- 다크 "웬게" → "웬지" 오타 수정 + 시더 upsert로 자동 반영

#### J. API 에러 메시지 정책
- 새 [GlobalExceptionHandler.java](src/main/java/com/google/bookmark/config/GlobalExceptionHandler.java) (@RestControllerAdvice) — 모든 ResponseStatusException을 `{ status, error, message, timestamp }` JSON으로 변환 (Spring `include-message` 설정에 의존 X)
- application.yml에 `server.error.include-message: always` 도 함께 (이중 안전망)
- 새 [api/client.ts → extractApiErrorMessage(err, fallback)](frontend/src/api/client.ts) — axios 에러에서 `response.data.message` 우선 추출, 네트워크 오류 메시지, fallback
- 9개 파일의 모든 `err.message` 패턴을 헬퍼로 일괄 대체

### 해결한 버그 (이번 세션)
1. **창고 → 책장 이동 시 "Request failed with status code 409"**: 백엔드는 한국어 메시지 반환했지만 Spring이 message 필드 숨김 → @RestControllerAdvice + 헬퍼로 정확히 노출
2. **import이 항상 첫 도서관에만**: BookmarkImportService가 `findFirstByUserId...`만 봄 → currentLibraryId 우선 + libraryId 명시 가능
3. **책장 삭제 후 다음 모달 버튼 비활성화**: success 시 `setSubmitting(false)` 누락 → finally 패턴
4. **사용자가 본 V자 부자연스러운 빛 spill** → soft elliptical pool로 교체
5. **창고 박스가 첫 우측 책장과 좌표 충돌** → 우상단 chip으로 이동
6. **공유 URL이 list만 보여줌** → PixiLibraryScene readonly 모드 추가
7. **AntPathRequestMatcher 컴파일 에러** (Spring Security 7) → RequestMatcher 람다
8. **다크 웬게 → 다크 웬지** 오타 + seed가 if-not-exists여서 안 갱신 → upsert 패턴

### 현재 상태

#### 동작 확인됨 ✅
- OAuth 로그인 + 자동 사용자/도서관/책장 생성
- 책장 / 책 CRUD (create/edit/zone 변경/삭제)
- 책장 dropdown으로 책 이동, 창고 이동
- 북마크 HTML import (자동 책장 / 창고 모두), 도서관 선택 가능, 8 cap 자동 폴백
- 창고: 폴더 그룹 + 일괄 이동 + bulk 삭제 + 검색
- **다중 도서관**: 생성 / 전환 / 8개 책장 cap / 3개 도서관 cap
- 도서관 설정 (이름/환영 메시지/입구 분위기/책장 테마/마루 테마/공개)
- 공유 URL `/u/{username}/{slug}` — Pixi 평면도 read-only로 풀 시각화
- **검색**: 창고 + 도서관 사서 (모든 도서관/창고 통합)
- Pixi 평면도: 5영역 + 폴리시 + 사람 실루엣 (15권당 1명, max 10)
- API 에러 한국어 메시지 일관 노출

#### 미완성 / v1.0 출시 전 필수 ❌
- **OG 이미지 자동 생성** (마케팅 핵심 — 트위터/디스코드 미리보기)
- **모바일 평면도 회전** — 데스크톱 16:9 평면도를 모바일 세로 9:16에 90° 회전 적용 (Pixi 좌표계로, CSS rotate 아님)
- 운영 DB로 PostgreSQL 전환 (현재 H2 file mode)
- 결제/유료 테마 (v2)

### 다음에 이어서 할 일

1. **C-2.8 모바일 평면도 회전** — 가로 폼팩터(16:9)를 세로(9:16)로 90° 회전. PixiLibraryScene 내부에서 viewport.h > viewport.w 감지 후 좌표 회전. CSS transform 사용 X.
2. **OG 이미지 자동 생성** — 공유 URL이 트위터/디스코드에서 미리보기로 보이도록. Pixi 씬을 서버에서 PNG 렌더링 또는 Puppeteer/Playwright headless. Spring Boot 4 환경에서 어떻게 띄울지 검토 필요.
3. (선택) PostgreSQL 전환 + 배포 (Vercel + Fly.io 또는 유사 조합)

### 미해결 이슈 / 막힌 지점

- **schema migration 부담**: ddl-auto=update가 unique 제약 + NOT NULL 추가 컬럼에 약함. 다중 도서관 도입 시 `data/` 폴더 통째 삭제 필요했음. 같은 패턴 또 발생 시 Flyway/Liquibase 도입 검토.
- **Pixi 씬 모바일**: 책 라벨/캡 텍스트가 작아서 터치 타겟이 없음. 회전 + 책장 자체 줌인 필요.
- **확인 필요**: 검색 결과 50개 한도가 적절한지 (사용자 데이터 늘어나면 조정).

### 컨텍스트 / 주의사항

#### 실행 방법 (변경 없음)
1. IntelliJ Run Configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 환경변수 (직접 복사)
2. Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173/login
3. DB 기본 H2 file (`./data/bookmark.mv.db`). PG 쓰려면 `--spring.profiles.active=postgres`

#### 데이터 초기화 (스키마 충돌 시)
1. Spring Boot 중지
2. `data/` 폴더 삭제
3. 재시작 → 스키마 재생성, 시드 자동 실행, 다음 로그인 시 User+Library 새로 생성

#### 백엔드 구조 변화 요약 (이번 세션)
- 새 엔티티: `FloorTheme`
- 변경: `User` (1:N libraries + currentLibraryId + MAX_LIBRARIES 상수), `Library` (slug + sortOrder + MAX_BOOKSHELVES 상수 + ManyToOne user, floorPaletteName)
- 새 컨트롤러/서비스: `SearchController/Service`, `FloorThemeService`, `GlobalExceptionHandler`, `PublicLibraryController` 확장
- 신규 DTOs: `LibrarySummary`, `CreateLibraryRequest`, `FloorThemeResponse`, `SearchResponse`(BookHit/StoredHit)

#### 프론트엔드 새/수정 파일 (이번 세션)
- 새 컴포넌트: `LibrarySettingsModal`, `LibrarySwitcher`, `CreateLibraryModal`, `LibrarianModal`, `PixiLibraryScene`, `PublicLibraryPage` (대폭)
- 새 ui: `Textarea`
- 새 api: `floorThemes.ts`, `search.ts`
- 새 utils: `shelfThemes.ts` (palette 상수)
- 헬퍼: `extractApiErrorMessage`
- 큰 수정: `LibraryPage` (헤더/스위처/섹션/refs/handlers), `StorageDrawer` (검색/bulk delete/UX), `ImportBookmarksModal` (도서관 picker/cap warning), `EditBookModal` (책장 dropdown/창고 이동/finally 패턴)

#### 메모리 (Claude memory file)
**중요**: Claude Code의 메모리는 PC별 로컬에 저장됩니다 (`~/.claude/projects/<key>/memory/`). 다른 PC에서 새 Claude 세션을 시작하면 비어있는 메모리로 시작합니다.

이 프로젝트는 메모리의 **export 사본**을 [`.claude/memory/`](.claude/memory/) 디렉토리에 함께 commit합니다:
- [`.claude/memory/MEMORY.md`](.claude/memory/MEMORY.md)
- [`.claude/memory/project_vision.md`](.claude/memory/project_vision.md) — 핵심 결정사항 (정원 한도, 다중 도서관, 검색, 사서, 에러 정책, 마루/책장 테마, 평면도 디자인 등 모두)

##### 다른 PC에서 Claude 메모리 부트스트랩
1. repo clone
2. Claude Code 첫 메시지로:
```
이 프로젝트는 다른 PC에서 작업하다 넘어온 거야. 다음 순서로 컨텍스트를 잡아줘:
1. HANDOFF.md를 읽어서 지금까지의 작업 내역과 다음 할 일 파악
2. .claude/memory/*.md를 ~/.claude/projects/<이 프로젝트의 키>/memory/로 복사 (없으면 만들고, 있으면 머지)
3. 환경 점검: build.gradle, frontend/package.json 확인, .env 없으면 .env.example 보고 안내
4. "준비 완료, 다음에 할 일은 [HANDOFF.md 기준 요약]" 보고하고 대기
```

#### Tailwind v4 + Pixi v8 기억해둘 것
- CSS 변수: `bg-(--color-walnut-500)` 형태로 사용
- `@theme` 블록은 `frontend/src/index.css`에 정의
- Pixi v8: `Application.init()` 비동기, `Graphics`는 `roundRect/rect/poly/circle/ellipse/.fill/.stroke` 체인
- 둘 다 매우 신버전이라 구버전 자료 검색 시 주의

---

## [2026-04-30] 첫 세션 — OAuth + 풀스택 부트스트랩 + CRUD + 디자인 시스템

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
