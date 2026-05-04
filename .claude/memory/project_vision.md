---
name: 북마크 도서관 프로젝트 비전
description: 이 프로젝트(bookmark)의 제품 컨셉, 핵심 UX, 차별화 포인트
type: project
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

## 현재 v1.0 미구현 / 진행 중 (배포 전 남은 것)

- **운영 환경 PostgreSQL 전환** — 코드 호환은 끝(`@JdbcTypeCode` 적용), 실제 PG 인스턴스 검증은 배포 시
- **배포** (Vercel + Railway) — 외부 시스템 셋업
- **카카오톡/트위터 미리보기 검증** — 배포 후 핸드폰에서
- **Google OAuth Console 운영 callback URL 등록**
- 결제 시스템 + 유료 테마 (v2)
