// 북마크 도서관 발표 슬라이드 빌드 스크립트
// 발표자: 임재영 / 동성인재개발교육원 / 2026-05-18
// 18 slides / 16:9 / 사이트 톤(cream + walnut) 일관

const path = require("path");
const PPTX_MODULE_PATH = path.join(
  process.env.APPDATA || "",
  "npm",
  "node_modules",
  "pptxgenjs"
);
const pptxgen = require(PPTX_MODULE_PATH);

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
pres.author = "임재영";
pres.title = "북마크 도서관 — 도서관 메타포 풀스택 프로젝트";
pres.company = "동성인재개발교육원";

// === 컬러 팔레트 (사이트와 일관) ===
const C = {
  cream: "FAF7F2", // 배경
  creamWarm: "F0EBE0", // 카드/스테이지
  divider: "D8CDB8", // 경계선
  text: "2A2520", // 본문
  textMuted: "6B5D4F", // 캡션
  walnut: "8B5A3C", // 메인 액센트
  walnutDeep: "5C3A24", // 진한 액센트
  walnutDark: "2A1810", // 표지/엔딩 배경
  gold: "C9A961", // 강조
  forest: "4A6B47",
  burgundy: "7A2E2E",
  ocean: "3B5E7E",
  sage: "7A8F6E",
  charcoal: "3A3A3A",
};

// === 폰트 ===
const FONT = "Pretendard"; // 학원 PC에 없으면 자동으로 맑은고딕으로 폴백
const FONT_NUM = "Pretendard"; // 숫자도 같이

// ===== 헬퍼: 페이지 마커 (각 콘텐츠 슬라이드의 좌상단 작은 사각형) =====
function addHeaderMarker(slide, num, total = 18) {
  // 좌상단 walnut 사각형 (모티프)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5,
    y: 0.4,
    w: 0.12,
    h: 0.12,
    fill: { color: C.walnut },
    line: { type: "none" },
  });
  // 우상단 페이지 번호
  slide.addText(`${num} / ${total}`, {
    x: 8.7,
    y: 0.3,
    w: 1.0,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: C.textMuted,
    align: "right",
    valign: "middle",
    charSpacing: 1,
  });
}

// ===== 헬퍼: 슬라이드 타이틀 =====
function addTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.7,
    y: 0.35,
    w: 8,
    h: 0.7,
    fontFace: FONT,
    fontSize: opts.size || 28,
    color: opts.color || C.text,
    bold: true,
    align: "left",
    valign: "middle",
    margin: 0,
    charSpacing: -0.5,
  });
}

// ===== 헬퍼: 부제목/카테고리 라벨 =====
function addEyebrow(slide, text, x = 0.7, y = 0.15) {
  slide.addText(text, {
    x,
    y,
    w: 5,
    h: 0.25,
    fontFace: FONT,
    fontSize: 9,
    color: C.walnut,
    bold: true,
    charSpacing: 4,
    margin: 0,
  });
}

// ===== 헬퍼: 작은 책 일러스트 (rounded rect) =====
function drawBook(slide, x, y, w, h, color) {
  // 책 등 (메인 색)
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color },
    line: { type: "none" },
  });
  // 좌측 하이라이트 (lighten 효과)
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w: w * 0.15,
    h,
    fill: { color: "FFFFFF", transparency: 75 },
    line: { type: "none" },
  });
  // 우측 그림자
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + w * 0.85,
    y,
    w: w * 0.15,
    h,
    fill: { color: "000000", transparency: 80 },
    line: { type: "none" },
  });
  // 상단 캡
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w,
    h: h * 0.04,
    fill: { color: "000000", transparency: 60 },
    line: { type: "none" },
  });
}

// ===== 헬퍼: 미니 책장 (한 줄) =====
function drawShelf(slide, x, y, w, h, books) {
  // 우든 백패널
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: "6B4226" },
    line: { type: "none" },
  });
  // 백패널 안쪽 그림자
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.02,
    y: y + 0.02,
    w: w - 0.04,
    h: h - 0.04,
    fill: { color: "4A2D1A" },
    line: { type: "none" },
  });
  // 책들
  const bookW = (w - 0.06 - (books.length - 1) * 0.015) / books.length;
  books.forEach((color, i) => {
    drawBook(slide, x + 0.03 + i * (bookW + 0.015), y + 0.05, bookW, h - 0.1, color);
  });
  // 선반 바닥
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y: y + h,
    w,
    h: 0.04,
    fill: { color: "3D2817" },
    line: { type: "none" },
  });
}

// ===== 헬퍼: 푸터 (이름·학원·날짜 미니) =====
function addFooter(slide) {
  slide.addText("임재영 · 북마크 도서관 · 2026.05.18", {
    x: 0.5,
    y: 5.3,
    w: 9,
    h: 0.25,
    fontFace: FONT,
    fontSize: 9,
    color: C.textMuted,
    align: "left",
    margin: 0,
  });
}

// ===========================================================
// SLIDE 1 — 표지
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.walnutDark };

  // 우측 책장 일러스트 (장식)
  const bookColors = [C.walnut, C.gold, C.forest, C.burgundy, C.ocean, C.sage, C.walnut, C.gold];
  for (let i = 0; i < 8; i++) {
    const h = 2.5 + (i % 3) * 0.2;
    drawBook(s, 7.5 + i * 0.28, 1.0 + (3.5 - h) / 2, 0.22, h, bookColors[i]);
  }
  // 바닥 wood 띠
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.3,
    y: 4.6,
    w: 2.7,
    h: 0.08,
    fill: { color: C.walnut },
    line: { type: "none" },
  });

  // 작은 모티프 (좌상단)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6,
    y: 0.5,
    w: 0.5,
    h: 0.04,
    fill: { color: C.gold },
    line: { type: "none" },
  });

  // 타이틀
  s.addText("북마크 도서관", {
    x: 0.6,
    y: 1.0,
    w: 6.8,
    h: 1.2,
    fontFace: FONT,
    fontSize: 60,
    color: C.cream,
    bold: true,
    align: "left",
    valign: "middle",
    margin: 0,
    charSpacing: -1,
  });

  // 부제
  s.addText("내 북마크가 한 권의 책이 된다면", {
    x: 0.6,
    y: 2.2,
    w: 6.8,
    h: 0.55,
    fontFace: FONT,
    fontSize: 22,
    color: C.gold,
    align: "left",
    valign: "middle",
    margin: 0,
  });

  // 태그라인
  s.addText("도서관 메타포 풀스택 프로젝트", {
    x: 0.6,
    y: 2.75,
    w: 6.8,
    h: 0.4,
    fontFace: FONT,
    fontSize: 14,
    color: C.divider,
    italic: true,
    align: "left",
    valign: "middle",
    margin: 0,
  });

  // 구분선
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6,
    y: 4.2,
    w: 1.0,
    h: 0.02,
    fill: { color: C.gold },
    line: { type: "none" },
  });

  // 발표자 정보
  s.addText(
    [
      { text: "임재영", options: { bold: true, fontSize: 18, color: C.cream } },
      { text: "  ·  ", options: { fontSize: 18, color: C.walnut } },
      { text: "동성인재개발교육원", options: { fontSize: 16, color: C.divider } },
    ],
    { x: 0.6, y: 4.4, w: 6.8, h: 0.4, fontFace: FONT, align: "left", margin: 0 }
  );

  s.addText("2026년 5월 18일", {
    x: 0.6,
    y: 4.85,
    w: 6.8,
    h: 0.3,
    fontFace: FONT,
    fontSize: 12,
    color: C.textMuted,
    align: "left",
    margin: 0,
  });
}

// ===========================================================
// SLIDE 2 — 훅 (질문)
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 2);
  addEyebrow(s, "도입");

  // 큰 질문
  s.addText("여러분 북마크 폴더,", {
    x: 0.7,
    y: 1.5,
    w: 8.6,
    h: 0.9,
    fontFace: FONT,
    fontSize: 38,
    color: C.text,
    bold: true,
    align: "left",
    valign: "middle",
    margin: 0,
    charSpacing: -1,
  });
  s.addText("마지막으로 정리한 게 언제인가요?", {
    x: 0.7,
    y: 2.35,
    w: 8.6,
    h: 0.9,
    fontFace: FONT,
    fontSize: 38,
    color: C.walnut,
    bold: true,
    align: "left",
    valign: "middle",
    margin: 0,
    charSpacing: -1,
  });

  // 작은 점들 (어지러운 북마크 시각화)
  const seed = [
    [1.2, 4.0],
    [1.8, 4.3],
    [2.3, 4.05],
    [2.7, 4.4],
    [3.1, 4.15],
    [3.6, 4.4],
    [4.0, 4.1],
    [4.4, 4.4],
    [4.9, 4.2],
    [5.3, 4.45],
    [5.7, 4.1],
    [6.1, 4.4],
    [6.5, 4.15],
    [6.9, 4.45],
    [7.3, 4.2],
    [7.7, 4.4],
    [8.0, 4.1],
    [8.4, 4.35],
    [1.0, 4.55],
    [1.6, 4.7],
    [2.1, 4.6],
    [2.5, 4.75],
    [3.0, 4.55],
    [3.4, 4.78],
    [3.9, 4.55],
    [4.3, 4.78],
    [4.7, 4.6],
    [5.2, 4.78],
    [5.6, 4.55],
    [6.0, 4.75],
    [6.4, 4.6],
    [6.8, 4.8],
    [7.2, 4.6],
    [7.6, 4.78],
    [8.0, 4.55],
    [8.3, 4.75],
  ];
  seed.forEach(([x, y]) => {
    s.addShape(pres.shapes.OVAL, {
      x: x - 0.06,
      y: y - 0.06,
      w: 0.12,
      h: 0.12,
      fill: { color: C.walnut, transparency: 50 },
      line: { type: "none" },
    });
  });

  s.addText("스크롤만 무한…", {
    x: 0.7,
    y: 5.0,
    w: 8.6,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11,
    color: C.textMuted,
    italic: true,
    margin: 0,
  });
}

// ===========================================================
// SLIDE 3 — 문제 정의
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 3);
  addEyebrow(s, "문제");
  addTitle(s, "북마크는 도구이고, 도구는 정서가 없다");

  // 좌측 카드: 지금
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.7,
    y: 1.5,
    w: 4.2,
    h: 3.3,
    fill: { color: C.creamWarm },
    line: { color: C.divider, width: 1 },
  });
  s.addText("지금의 북마크", {
    x: 0.95,
    y: 1.7,
    w: 3.8,
    h: 0.35,
    fontFace: FONT,
    fontSize: 13,
    color: C.walnut,
    bold: true,
    charSpacing: 2,
    margin: 0,
  });
  s.addText(
    [
      { text: "일렬 나열식 폴더 트리", options: { bullet: true, breakLine: true, color: C.text, fontSize: 14 } },
      { text: "많아질수록 못 찾음", options: { bullet: true, breakLine: true, color: C.text, fontSize: 14 } },
      { text: "방치 → 재검색 → 또 저장", options: { bullet: true, breakLine: true, color: C.text, fontSize: 14 } },
      { text: "정서적 보상 0", options: { bullet: true, color: C.text, fontSize: 14 } },
    ],
    { x: 0.95, y: 2.15, w: 3.8, h: 2.5, fontFace: FONT, paraSpaceAfter: 8 }
  );

  // 우측 카드: 가설
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.1,
    y: 1.5,
    w: 4.2,
    h: 3.3,
    fill: { color: C.walnut },
    line: { type: "none" },
  });
  s.addText("우리의 가설", {
    x: 5.35,
    y: 1.7,
    w: 3.8,
    h: 0.35,
    fontFace: FONT,
    fontSize: 13,
    color: C.gold,
    bold: true,
    charSpacing: 2,
    margin: 0,
  });
  s.addText(
    "잘 정리된 책장을 보면\n뿌듯함을 느끼는 본능이 있다.",
    {
      x: 5.35,
      y: 2.2,
      w: 3.7,
      h: 1.4,
      fontFace: FONT,
      fontSize: 19,
      color: C.cream,
      bold: true,
      valign: "top",
      margin: 0,
      charSpacing: -0.5,
    }
  );
  s.addText(
    "북마크 관리에 그 정서를 입히면\n관리 자체가 즐거워진다.",
    {
      x: 5.35,
      y: 3.7,
      w: 3.7,
      h: 1.0,
      fontFace: FONT,
      fontSize: 13,
      color: C.divider,
      italic: true,
      valign: "top",
      margin: 0,
    }
  );

  addFooter(s);
}

// ===========================================================
// SLIDE 4 — 컨셉 (메타포 매핑 + 미니 평면도)
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 4);
  addEyebrow(s, "컨셉");
  addTitle(s, "북마크를 책장의 책처럼");

  // 좌측: 매핑 3행
  const mappings = [
    { from: "북마크", to: "책", desc: "URL 하나가 색깔 있는 책 한 권" },
    { from: "폴더", to: "책장", desc: "주제 폴더가 평면도의 책장" },
    { from: "사용자", to: "도서관", desc: "내 큐레이션 공간" },
  ];
  mappings.forEach((m, i) => {
    const y = 1.55 + i * 1.1;
    // 좌측 원형 (from)
    s.addShape(pres.shapes.OVAL, {
      x: 0.7,
      y,
      w: 1.05,
      h: 0.85,
      fill: { color: C.creamWarm },
      line: { color: C.divider, width: 1 },
    });
    s.addText(m.from, {
      x: 0.7,
      y,
      w: 1.05,
      h: 0.85,
      fontFace: FONT,
      fontSize: 14,
      color: C.text,
      bold: true,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    // 화살표
    s.addText("→", {
      x: 1.8,
      y: y + 0.05,
      w: 0.4,
      h: 0.75,
      fontFace: FONT,
      fontSize: 22,
      color: C.walnut,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    // 우측 원형 (to)
    s.addShape(pres.shapes.OVAL, {
      x: 2.25,
      y,
      w: 1.05,
      h: 0.85,
      fill: { color: C.walnut },
      line: { type: "none" },
    });
    s.addText(m.to, {
      x: 2.25,
      y,
      w: 1.05,
      h: 0.85,
      fontFace: FONT,
      fontSize: 14,
      color: C.cream,
      bold: true,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    // 설명
    s.addText(m.desc, {
      x: 3.4,
      y: y + 0.15,
      w: 2.0,
      h: 0.6,
      fontFace: FONT,
      fontSize: 10,
      color: C.textMuted,
      valign: "middle",
      margin: 0,
    });
  });

  // 우측: 실제 데스크톱 평면도 스크린샷
  // 원본 1102x619 (16:9). 화면 우측에 4.0 너비로 박음 → 높이 2.25
  const fpW = 4.0;
  const fpH = fpW * (619 / 1102); // ≈ 2.247
  const fpX = 5.5;
  const fpY = 1.7;
  // 프레임 (월넛 보더)
  s.addShape(pres.shapes.RECTANGLE, {
    x: fpX - 0.05,
    y: fpY - 0.05,
    w: fpW + 0.1,
    h: fpH + 0.1,
    fill: { color: C.walnut },
    line: { type: "none" },
  });
  s.addImage({
    path: path.join(__dirname, "screenshots", "desktop.png"),
    x: fpX,
    y: fpY,
    w: fpW,
    h: fpH,
  });
  // 라벨
  s.addText("실제 도서관 평면도 — top-down 시점", {
    x: fpX,
    y: fpY + fpH + 0.15,
    w: fpW,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: C.textMuted,
    align: "center",
    italic: true,
    margin: 0,
  });

  addFooter(s);
}

// ===========================================================
// SLIDE 5 — 북극성
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 5);
  addEyebrow(s, "방향");
  addTitle(s, "이 제품의 성공 지표");

  // 큰 인용구
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.7,
    y: 1.5,
    w: 8.6,
    h: 1.9,
    fill: { color: C.creamWarm },
    line: { type: "none" },
  });
  // 좌측 walnut 액센트 바
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.7,
    y: 1.5,
    w: 0.08,
    h: 1.9,
    fill: { color: C.walnut },
    line: { type: "none" },
  });
  s.addText(
    [
      { text: "“", options: { fontSize: 36, color: C.walnut, bold: true } },
      {
        text: "누군가가 내가 만든 북마크 도서관 UI를",
        options: { fontSize: 22, color: C.text, bold: true },
      },
    ],
    { x: 1.0, y: 1.65, w: 8.0, h: 0.7, fontFace: FONT, margin: 0 }
  );
  s.addText("꾸며서 공유해 올리는, 그런 것.", {
    x: 1.0,
    y: 2.3,
    w: 8.0,
    h: 0.6,
    fontFace: FONT,
    fontSize: 22,
    color: C.text,
    bold: true,
    margin: 0,
  });
  s.addText("→ 성공 지표는 사용자 수가 아니라  “꾸미고 자랑하고 싶어지는가”", {
    x: 1.0,
    y: 2.95,
    w: 8.0,
    h: 0.4,
    fontFace: FONT,
    fontSize: 13,
    color: C.walnutDeep,
    italic: true,
    margin: 0,
  });

  // 계보 chips
  s.addText("이 제품의 계보", {
    x: 0.7,
    y: 3.7,
    w: 8.6,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11,
    color: C.textMuted,
    charSpacing: 2,
    margin: 0,
  });
  const lineage = ["싸이월드 미니홈피", "Notion", "Pinterest", "Tumblr"];
  lineage.forEach((name, i) => {
    const x = 0.7 + i * 2.15;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x,
      y: 4.05,
      w: 1.95,
      h: 0.55,
      fill: { color: C.cream },
      line: { color: C.walnut, width: 1.2 },
      rectRadius: 0.1,
    });
    s.addText(name, {
      x,
      y: 4.05,
      w: 1.95,
      h: 0.55,
      fontFace: FONT,
      fontSize: 13,
      color: C.walnut,
      bold: true,
      align: "center",
      valign: "middle",
      margin: 0,
    });
  });

  s.addText("도구가 아닌 캔버스. 결과물에 “나”가 담기는 제품.", {
    x: 0.7,
    y: 4.8,
    w: 8.6,
    h: 0.3,
    fontFace: FONT,
    fontSize: 12,
    color: C.textMuted,
    italic: true,
    margin: 0,
  });

  addFooter(s);
}

// ===========================================================
// SLIDE 6 — 의도된 제약
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 6);
  addEyebrow(s, "제약");
  addTitle(s, "한도가 컨셉이다");

  // 3개의 큰 stat callout
  const stats = [
    { num: "3", unit: "개", label: "사용자당 도서관", note: "User.MAX_LIBRARIES" },
    { num: "8", unit: "개", label: "도서관당 책장", note: "평면도 좌우 4개씩 균형" },
    { num: "30", unit: "권", label: "책장당 책", note: "큐레이션 강제" },
  ];
  stats.forEach((stat, i) => {
    const x = 0.7 + i * 3.0;
    // 카드
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y: 1.5,
      w: 2.8,
      h: 2.6,
      fill: { color: C.creamWarm },
      line: { type: "none" },
    });
    // 상단 walnut 띠
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y: 1.5,
      w: 2.8,
      h: 0.1,
      fill: { color: C.walnut },
      line: { type: "none" },
    });
    // 큰 숫자
    s.addText(stat.num, {
      x,
      y: 1.7,
      w: 2.8,
      h: 1.4,
      fontFace: FONT_NUM,
      fontSize: 96,
      color: C.walnutDeep,
      bold: true,
      align: "center",
      valign: "middle",
      margin: 0,
      charSpacing: -3,
    });
    // 단위
    s.addText(stat.unit, {
      x: x + 1.7,
      y: 2.8,
      w: 1.0,
      h: 0.4,
      fontFace: FONT,
      fontSize: 16,
      color: C.walnut,
      bold: true,
      margin: 0,
    });
    // 라벨
    s.addText(stat.label, {
      x,
      y: 3.25,
      w: 2.8,
      h: 0.35,
      fontFace: FONT,
      fontSize: 14,
      color: C.text,
      bold: true,
      align: "center",
      margin: 0,
    });
    // 노트
    s.addText(stat.note, {
      x,
      y: 3.6,
      w: 2.8,
      h: 0.3,
      fontFace: FONT,
      fontSize: 10,
      color: C.textMuted,
      align: "center",
      italic: true,
      margin: 0,
    });
  });

  // 하단 설명
  s.addText(
    [
      {
        text: "“기록보관소”가 아닌 ",
        options: { fontSize: 14, color: C.text },
      },
      {
        text: "큐레이션된 공간",
        options: { fontSize: 14, color: C.walnut, bold: true },
      },
      {
        text: ". 한도 초과분은 별도 ",
        options: { fontSize: 14, color: C.text },
      },
      {
        text: "창고(Storage)",
        options: { fontSize: 14, color: C.walnut, bold: true },
      },
      {
        text: "에 무제한 보관 — 데이터 잃지 않으면서 도서관은 깨끗하게.",
        options: { fontSize: 14, color: C.text },
      },
    ],
    { x: 0.7, y: 4.4, w: 8.6, h: 0.6, fontFace: FONT, margin: 0, valign: "middle" }
  );

  addFooter(s);
}

// ===========================================================
// SLIDE 7 — 두 질문 룰
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 7);
  addEyebrow(s, "결정 기준");
  addTitle(s, "모든 기능은 이 두 질문을 통과한다");

  // 좌측 카드 Q1
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.7,
    y: 1.5,
    w: 4.2,
    h: 2.9,
    fill: { color: C.cream },
    line: { color: C.walnut, width: 1.5 },
  });
  s.addText("Q1", {
    x: 0.9,
    y: 1.7,
    w: 0.7,
    h: 0.5,
    fontFace: FONT,
    fontSize: 32,
    color: C.walnut,
    bold: true,
    margin: 0,
  });
  s.addText("도서관 메타포에\n부합하는가?", {
    x: 0.9,
    y: 2.3,
    w: 3.8,
    h: 1.1,
    fontFace: FONT,
    fontSize: 22,
    color: C.text,
    bold: true,
    margin: 0,
    charSpacing: -0.5,
  });
  s.addText("“자동 정렬 옵션”은 통과 X — 큐레이션 캔버스 컨셉과 충돌", {
    x: 0.9,
    y: 3.5,
    w: 3.8,
    h: 0.7,
    fontFace: FONT,
    fontSize: 11,
    color: C.textMuted,
    italic: true,
    margin: 0,
  });

  // 우측 카드 Q2
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.1,
    y: 1.5,
    w: 4.2,
    h: 2.9,
    fill: { color: C.walnut },
    line: { type: "none" },
  });
  s.addText("Q2", {
    x: 5.3,
    y: 1.7,
    w: 0.7,
    h: 0.5,
    fontFace: FONT,
    fontSize: 32,
    color: C.gold,
    bold: true,
    margin: 0,
  });
  s.addText("사용자가\n꾸미고 자랑하고\n싶어지는가?", {
    x: 5.3,
    y: 2.3,
    w: 3.8,
    h: 1.5,
    fontFace: FONT,
    fontSize: 22,
    color: C.cream,
    bold: true,
    margin: 0,
    charSpacing: -0.5,
  });
  s.addText("책 색상 picker / 드래그 정렬 / 동적 OG 이미지 — 모두 통과", {
    x: 5.3,
    y: 3.85,
    w: 3.8,
    h: 0.4,
    fontFace: FONT,
    fontSize: 11,
    color: C.divider,
    italic: true,
    margin: 0,
  });

  // 하단 메시지
  s.addText(
    "둘 다 통과해야 빌드 — “효율적 도구” 단순화 제안은 의식적으로 거절",
    {
      x: 0.7,
      y: 4.6,
      w: 8.6,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13,
      color: C.walnutDeep,
      bold: true,
      align: "center",
      margin: 0,
    }
  );

  addFooter(s);
}

// ===========================================================
// SLIDE 8 — 아키텍처
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 8);
  addEyebrow(s, "전체 구조");
  addTitle(s, "프론트엔드 ↔ 백엔드 ↔ DB · AI");

  // 4박스 배치
  const boxes = [
    { label: "사용자", sub: "브라우저\n데스크톱 / 모바일", color: C.creamWarm, textC: C.text },
    { label: "화면", sub: "React 화면\nVercel 호스팅", color: C.walnut, textC: C.cream },
    { label: "서버", sub: "Spring Boot 로직\nRailway 호스팅", color: C.walnutDeep, textC: C.cream },
    { label: "DB · AI", sub: "PostgreSQL 저장소\nGemini 자동 분류", color: C.charcoal, textC: C.cream },
  ];
  const startX = 0.7,
    boxW = 1.95,
    gap = 0.25,
    y = 1.7;
  boxes.forEach((b, i) => {
    const x = startX + i * (boxW + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: boxW,
      h: 1.6,
      fill: { color: b.color },
      line: { type: "none" },
    });
    s.addText(b.label, {
      x,
      y: y + 0.15,
      w: boxW,
      h: 0.7,
      fontFace: FONT,
      fontSize: 18,
      color: b.textC,
      bold: true,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    s.addText(b.sub, {
      x,
      y: y + 0.85,
      w: boxW,
      h: 0.7,
      fontFace: FONT,
      fontSize: 11,
      color: b.textC,
      align: "center",
      valign: "top",
      margin: 0,
    });
    // 화살표
    if (i < boxes.length - 1) {
      s.addText("→", {
        x: x + boxW,
        y: y + 0.65,
        w: gap,
        h: 0.3,
        fontFace: FONT,
        fontSize: 20,
        color: C.walnut,
        align: "center",
        valign: "middle",
        margin: 0,
      });
    }
  });

  // 하단: 핵심 패턴 (3개)
  const patterns = [
    { t: "공유 미리보기", d: "디스코드 · 카톡 봇에는\n미리보기용 화면을 따로 응답" },
    { t: "구글 로그인", d: "프론트와 백엔드가\n같은 주소로 보이도록 통일" },
    { t: "미리보기 캐시", d: "도서관별 이미지를\n5분간 메모리에 보관" },
  ];
  patterns.forEach((p, i) => {
    const x = 0.7 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y: 3.7,
      w: 2.8,
      h: 1.2,
      fill: { color: C.cream },
      line: { color: C.divider, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y: 3.7,
      w: 0.06,
      h: 1.2,
      fill: { color: C.walnut },
      line: { type: "none" },
    });
    s.addText(p.t, {
      x: x + 0.2,
      y: 3.8,
      w: 2.5,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13,
      color: C.walnut,
      bold: true,
      margin: 0,
    });
    s.addText(p.d, {
      x: x + 0.2,
      y: 4.2,
      w: 2.5,
      h: 0.7,
      fontFace: FONT,
      fontSize: 11,
      color: C.text,
      margin: 0,
    });
  });

  addFooter(s);
}

// ===========================================================
// SLIDE 9 — 스택
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 9);
  addEyebrow(s, "사용한 기술");
  addTitle(s, "선택한 도구, 선택한 이유");

  const groups = [
    {
      title: "백엔드",
      color: C.walnut,
      items: [
        "Spring Boot 4 (Java 17)",
        "구글 로그인 (OAuth)",
        "JPA — DB 연결",
        "PostgreSQL — 데이터 저장",
        "메모리 캐시 (Caffeine)",
      ],
    },
    {
      title: "프론트엔드",
      color: C.walnutDeep,
      items: [
        "React 19 + TypeScript",
        "Vite — 개발 서버",
        "Pixi.js — 평면도 그래픽",
        "드래그 정렬 라이브러리",
        "Tailwind — 스타일링",
      ],
    },
    {
      title: "배포 · AI",
      color: C.charcoal,
      items: [
        "Railway — 서버 호스팅",
        "Vercel — 화면 호스팅",
        "Docker — 배포 자동화",
        "Gemini — AI 자동 분류",
        "사용자별 호출 제한",
      ],
    },
  ];
  groups.forEach((g, i) => {
    const x = 0.7 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y: 1.5,
      w: 2.8,
      h: 3.5,
      fill: { color: C.cream },
      line: { color: C.divider, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y: 1.5,
      w: 2.8,
      h: 0.5,
      fill: { color: g.color },
      line: { type: "none" },
    });
    s.addText(g.title, {
      x,
      y: 1.5,
      w: 2.8,
      h: 0.5,
      fontFace: FONT,
      fontSize: 14,
      color: C.cream,
      bold: true,
      align: "center",
      valign: "middle",
      charSpacing: 2,
      margin: 0,
    });
    s.addText(
      g.items.map((it, idx) => ({
        text: it,
        options: {
          bullet: true,
          breakLine: idx !== g.items.length - 1,
          color: C.text,
          fontSize: 12,
        },
      })),
      { x: x + 0.2, y: 2.15, w: 2.5, h: 2.6, fontFace: FONT, paraSpaceAfter: 8 }
    );
  });

  addFooter(s);
}

// ===== 헬퍼: 의사결정 4박자 슬라이드 =====
function decisionSlide(num, eyebrow, title, problem, options, choice, outcome) {
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, num);
  addEyebrow(s, eyebrow);
  addTitle(s, title);

  // 4박자 2x2 카드
  const cells = [
    { label: "문제", body: problem, bg: C.creamWarm, textC: C.text, accent: C.burgundy },
    { label: "옵션", body: options, bg: C.creamWarm, textC: C.text, accent: C.ocean },
    { label: "결정", body: choice, bg: C.walnut, textC: C.cream, accent: C.gold },
    { label: "결과", body: outcome, bg: C.creamWarm, textC: C.text, accent: C.forest },
  ];
  cells.forEach((c, i) => {
    const col = i % 2,
      row = Math.floor(i / 2);
    const x = 0.7 + col * 4.4;
    const y = 1.45 + row * 1.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: 4.2,
      h: 1.65,
      fill: { color: c.bg },
      line: { type: "none" },
    });
    // 좌측 액센트 바
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: 0.08,
      h: 1.65,
      fill: { color: c.accent },
      line: { type: "none" },
    });
    s.addText(c.label, {
      x: x + 0.25,
      y: y + 0.12,
      w: 3.7,
      h: 0.3,
      fontFace: FONT,
      fontSize: 10,
      color: c.accent,
      bold: true,
      charSpacing: 4,
      margin: 0,
    });
    s.addText(c.body, {
      x: x + 0.25,
      y: y + 0.42,
      w: 3.8,
      h: 1.15,
      fontFace: FONT,
      fontSize: 12.5,
      color: c.textC,
      valign: "top",
      margin: 0,
    });
  });

  addFooter(s);
  return s;
}

// ===========================================================
// SLIDE 10 — 결정 1: Pixi.js
// ===========================================================
decisionSlide(
  10,
  "결정 1 — 평면도 그리기",
  "평면도를 어떻게 그릴까",
  "책장이 일렬로 죽 늘어선 형태면 “도서관” 느낌이 안 살아난다. 위에서 내려다보는 평면도가 필요.",
  "방법 4가지를 비교:\n일반 HTML, SVG 그림, 캔버스, Pixi.js (게임용 그래픽).\n책 100권 + 모바일에서도 부드러워야 함.",
  "Pixi.js 선택.\n게임 엔진처럼 GPU를 써서 빠르고, 시간대 전환도 부드럽게 처리.",
  "낮·저녁·밤 광원 자연스럽게 바뀌고,\n책 색 다양해도 끊김 없음.\n모바일·태블릿·데스크톱 모두 같은 코드로 작동."
);

// ===========================================================
// SLIDE 11 — 결정 2: OAuth 도메인 픽스
// ===========================================================
decisionSlide(
  11,
  "결정 2 — 배포 직후의 첫 버그",
  "배포하자마자 로그인이 안 됐다",
  "구글 인증은 통과되는데 마지막 단계에서 에러.\n원인: 화면 주소(vercel)와 서버 주소(railway)가 달라서 로그인 정보가 따라오지 못함.",
  "방법 3가지: 전체 구조 다시 짜기 / 쿠키 도메인 강제 설정 / 콜백 주소 직접 지정.\n— 가장 적은 코드 수정으로 끝내는 게 핵심.",
  "Spring 설정에서 콜백 주소를\n프론트엔드 주소로 명시 고정.",
  "구글 → 프론트 → 서버 흐름이 한 도메인 안에서 일관 유지.\n로그인 성공. 진단에 반나절, 픽스는 한 줄."
);

// ===========================================================
// SLIDE 12 — 결정 3: 봇/사람 SSR 분기
// ===========================================================
decisionSlide(
  12,
  "결정 3 — 공유했을 때 미리보기",
  "공유 주소의 미리보기를 살리려면",
  "디스코드·카톡·트위터에 주소를 붙이면 보통 미리보기 카드가 뜬다.\n그런데 React로 만든 화면은 봇이 빈 화면으로 인식 → 미리보기 0 → 입소문 0.",
  "방법 3가지: 전체 구조 다시 짜기 / 모든 페이지 미리 만들기 / 봇에게만 다른 화면 응답.\n— 첫 두 개는 비용이 큼.",
  "봇만 따로 인식해서 미리보기용 HTML을 보내고,\n사람은 평소대로 React 화면을 받게 설정.",
  "디스코드·트위터·카톡 봇은 미리보기 카드를 받고,\n사람 사용자는 평소대로 사이트 이용. 양쪽 모두 손해 0."
);

// ===========================================================
// SLIDE 13 — 결정 4: 동적 OG + Caffeine
// ===========================================================
decisionSlide(
  13,
  "결정 4 — 도서관별 미리보기 이미지",
  "미리보기 이미지를 어떻게 만들까",
  "모든 도서관이 똑같은 이미지면 “어, 내 거다”라는 어필이 없다.\n각자의 책 색깔이 미리보기에 들어가야 클릭 욕구가 생긴다.",
  "방법 3가지: 화면을 매번 캡처해서 저장(용량 폭주로 실패) / 요청 올 때마다 새로 그리기(느림) / 한 번 그린 걸 잠시 저장.",
  "서버에서 도서관별로 책 색깔만 모아 그리고,\n5분간 메모리에 보관 후 같은 요청은 바로 응답.",
  "본인 책 색이 그대로 미리보기에 들어감 (그리는 데 0.03초).\n도서관 수정하면 자동으로 새 미리보기로 갱신."
);

// ===========================================================
// SLIDE 14 — 결정 5: AI (Gemini)
// ===========================================================
decisionSlide(
  14,
  "결정 5 — AI 자동 분류",
  "AI를 어떻게 끼워 넣을까",
  "크롬에서 북마크 91권을 한 번에 가져오면\n폴더명만 있고 제대로 된 제목·키워드·색이 없다.\n91개를 손으로 다 손볼 수는 없음.",
  "방법 3가지: 유료 GPT (비용), 무료 Gemini (품질 충분), 직접 규칙으로 분류 (한계).\n— 무료 가능성 + 학습 가치 고려.",
  "구글 Gemini 무료 모델 사용.\n사용자별 분당 호출 제한 + 결과는 백그라운드에서 천천히 채움.",
  "책 제목·키워드·표지색이 자동으로 들어감.\n무료 한도 안에서 안정적, 사용자는 기다림 없이 import 끝남."
);

// ===========================================================
// SLIDE 15 — 모바일 대응
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 15);
  addEyebrow(s, "반응형");
  addTitle(s, "한 개의 코드 / 세 개의 화면 비율");

  // 3개 viewport 실제 스크린샷 (좌→우: 데스크톱 / 태블릿 / 폰)
  // 모든 디바이스가 같은 baseline에 서있도록 — 가장 큰 h 기준으로 align
  const viewports = [
    {
      file: "desktop.png",
      label: "데스크톱",
      ratio: "16:9",
      sub: "기본",
      origW: 1102,
      origH: 619,
      targetH: 1.25,
    },
    {
      file: "tablet.png",
      label: "태블릿",
      ratio: "5:7",
      sub: "<1080px portrait",
      origW: 519,
      origH: 580,
      targetH: 1.7,
    },
    {
      file: "mobile.png",
      label: "폰",
      ratio: "9:16",
      sub: "<600px",
      origW: 360,
      origH: 626,
      targetH: 1.85,
    },
  ];
  const baselineY = 1.7 + 1.85; // 가장 긴 (mobile) 하단에 정렬
  let xCursor = 0.6;
  viewports.forEach((v) => {
    const w = v.targetH * (v.origW / v.origH);
    const x = xCursor;
    const y = baselineY - v.targetH;
    // 월넛 프레임 (보더)
    s.addShape(pres.shapes.RECTANGLE, {
      x: x - 0.04,
      y: y - 0.04,
      w: w + 0.08,
      h: v.targetH + 0.08,
      fill: { color: C.walnut },
      line: { type: "none" },
    });
    s.addImage({
      path: path.join(__dirname, "screenshots", v.file),
      x,
      y,
      w,
      h: v.targetH,
    });
    // 라벨
    const labelY = baselineY + 0.1;
    s.addText(v.label, {
      x: x - 0.1,
      y: labelY,
      w: w + 0.2,
      h: 0.28,
      fontFace: FONT,
      fontSize: 11,
      color: C.text,
      bold: true,
      align: "center",
      margin: 0,
    });
    s.addText(v.ratio, {
      x: x - 0.1,
      y: labelY + 0.28,
      w: w + 0.2,
      h: 0.25,
      fontFace: FONT,
      fontSize: 10,
      color: C.walnut,
      align: "center",
      margin: 0,
    });
    s.addText(v.sub, {
      x: x - 0.3,
      y: labelY + 0.52,
      w: w + 0.6,
      h: 0.22,
      fontFace: FONT,
      fontSize: 8.5,
      color: C.textMuted,
      align: "center",
      italic: true,
      margin: 0,
    });
    xCursor += w + 0.3;
  });

  // 우측: 모바일 트랩 두 개
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.1,
    y: 1.5,
    w: 3.4,
    h: 3.3,
    fill: { color: C.creamWarm },
    line: { type: "none" },
  });
  s.addText("모바일에서 발견한 함정 2가지", {
    x: 6.3,
    y: 1.65,
    w: 3.1,
    h: 0.35,
    fontFace: FONT,
    fontSize: 11,
    color: C.walnut,
    bold: true,
    charSpacing: 2,
    margin: 0,
  });
  // 함정 1
  s.addText("01  열자마자 닫히는 모달", {
    x: 6.3,
    y: 2.1,
    w: 3.1,
    h: 0.3,
    fontFace: FONT,
    fontSize: 14,
    color: C.text,
    bold: true,
    margin: 0,
  });
  s.addText(
    "터치한 위치에 모달이 즉시 떠서, 같은 터치가 바깥을 누른 걸로 인식 → 0.2초 만에 닫힘.\n→ 모달을 연 직후 0.25초간 바깥 클릭을 무시하도록 처리.",
    {
      x: 6.3,
      y: 2.42,
      w: 3.1,
      h: 0.95,
      fontFace: FONT,
      fontSize: 10.5,
      color: C.text,
      valign: "top",
      margin: 0,
    }
  );
  // 함정 2
  s.addText("02  모바일에서 안 보이는 버튼", {
    x: 6.3,
    y: 3.5,
    w: 3.1,
    h: 0.3,
    fontFace: FONT,
    fontSize: 14,
    color: C.text,
    bold: true,
    margin: 0,
  });
  s.addText(
    "마우스를 올려야 보이는 편집 · 삭제 버튼이 모바일에서는 영영 안 보임.\n→ 데스크톱에서만 마우스 올리기로 보이게 하고, 모바일은 항상 보이게 분기.",
    {
      x: 6.3,
      y: 3.82,
      w: 3.1,
      h: 0.85,
      fontFace: FONT,
      fontSize: 10.5,
      color: C.text,
      valign: "top",
      margin: 0,
    }
  );

  addFooter(s);
}

// ===========================================================
// SLIDE 16 — 배운 것
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeaderMarker(s, 16);
  addEyebrow(s, "배운 것");
  addTitle(s, "이 프로젝트에서 배운 세 가지");

  const lessons = [
    {
      n: "01",
      t: "비전이 결정을 단순하게 만든다",
      d: "“두 질문 룰” 덕분에 자동정렬 옵션·목록형 fallback 같은 “효율적” 제안을 거절할 수 있었다. 비전이 없으면 모든 좋아 보이는 기능을 다 받는다.",
    },
    {
      n: "02",
      t: "실패는 배포 후에 시작된다",
      d: "OAuth 도메인 픽스 · OG 캡처 폭주 · JVM heap OOM · Vercel rewrite — 학교에서 다루지 않는 “환경이 만든 버그”. 진단력은 운영해야 자란다.",
    },
    {
      n: "03",
      t: "기능 위에 감정 한 겹을 얹는다",
      d: "북마크 관리 도구는 기본, 그 위에 “꾸미는 재미”가 얹혀야 사용자가 다시 온다. 친구 첫 피드백이 기능 칭찬이 아닌 “색깔 고르는 게 재밌다”였다. 정서가 작동한 신호.",
    },
  ];
  lessons.forEach((l, i) => {
    const y = 1.5 + i * 1.15;
    // 카드
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.7,
      y,
      w: 8.6,
      h: 1.0,
      fill: { color: C.creamWarm },
      line: { type: "none" },
    });
    // 좌측 큰 번호
    s.addText(l.n, {
      x: 0.85,
      y: y + 0.1,
      w: 0.9,
      h: 0.8,
      fontFace: FONT_NUM,
      fontSize: 36,
      color: C.walnut,
      bold: true,
      align: "left",
      valign: "middle",
      margin: 0,
    });
    // 제목
    s.addText(l.t, {
      x: 1.75,
      y: y + 0.13,
      w: 7.4,
      h: 0.4,
      fontFace: FONT,
      fontSize: 16,
      color: C.text,
      bold: true,
      margin: 0,
    });
    // 본문
    s.addText(l.d, {
      x: 1.75,
      y: y + 0.5,
      w: 7.4,
      h: 0.5,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.text,
      margin: 0,
      valign: "top",
    });
  });

  addFooter(s);
}

// ===========================================================
// SLIDE 17 — DEMO (라이브 시연) — 발표 마지막에 배치
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.walnutDark };

  // 작은 모티프
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6,
    y: 0.5,
    w: 0.5,
    h: 0.04,
    fill: { color: C.gold },
    line: { type: "none" },
  });

  // 좌측: 메인 타이틀
  s.addText("이제 직접 보여드릴게요", {
    x: 0.7,
    y: 1.1,
    w: 5,
    h: 0.5,
    fontFace: FONT,
    fontSize: 14,
    color: C.gold,
    bold: true,
    charSpacing: 2,
    margin: 0,
  });
  s.addText("라이브 시연", {
    x: 0.7,
    y: 1.65,
    w: 6,
    h: 1.4,
    fontFace: FONT,
    fontSize: 64,
    color: C.cream,
    bold: true,
    margin: 0,
    charSpacing: -1,
  });
  s.addText("bookmark-library-iota.vercel.app", {
    x: 0.7,
    y: 3.15,
    w: 6,
    h: 0.4,
    fontFace: "Consolas",
    fontSize: 14,
    color: C.gold,
    margin: 0,
  });
  s.addText("약 7분", {
    x: 0.7,
    y: 4.7,
    w: 6,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11,
    color: C.divider,
    italic: true,
    margin: 0,
  });

  // 우측: 시연 흐름 카드
  const flow = [
    { n: "01", t: "로그인 + 첫 안내 화면" },
    { n: "02", t: "크롬 북마크 가져오기\n— AI가 뒤에서 자동 분류" },
    { n: "03", t: "책 색깔 고르기\n— AI 추천 + 최근 색 기억" },
    { n: "04", t: "책 드래그로 순서 바꾸기\n— 책 등 색띠를 잡고" },
    { n: "05", t: "공유 주소를 디스코드에 붙여\n미리보기 카드 확인" },
  ];
  flow.forEach((step, i) => {
    const y = 1.0 + i * 0.85;
    s.addText(step.n, {
      x: 6.7,
      y,
      w: 0.6,
      h: 0.8,
      fontFace: FONT_NUM,
      fontSize: 22,
      color: C.gold,
      bold: true,
      align: "left",
      valign: "top",
      margin: 0,
    });
    s.addText(step.t, {
      x: 7.3,
      y,
      w: 2.5,
      h: 0.8,
      fontFace: FONT,
      fontSize: 12,
      color: C.cream,
      valign: "top",
      margin: 0,
    });
  });
}

// ===========================================================
// SLIDE 18 — 감사 + Q&A
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.walnutDark };

  // 책장 일러스트 (좌측)
  const bookColors = [C.gold, C.walnut, C.forest, C.burgundy, C.ocean, C.sage, C.gold];
  for (let i = 0; i < 7; i++) {
    const h = 2.2 + (i % 3) * 0.2;
    drawBook(s, 0.5 + i * 0.28, 1.2 + (3.0 - h) / 2, 0.22, h, bookColors[i]);
  }
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4,
    y: 4.25,
    w: 2.4,
    h: 0.08,
    fill: { color: C.walnut },
    line: { type: "none" },
  });

  // 우측 컨텐츠
  s.addText("감사합니다", {
    x: 3.5,
    y: 1.2,
    w: 6.0,
    h: 1.2,
    fontFace: FONT,
    fontSize: 60,
    color: C.cream,
    bold: true,
    margin: 0,
    charSpacing: -1,
  });
  // 구분선
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.5,
    y: 2.6,
    w: 1.0,
    h: 0.02,
    fill: { color: C.gold },
    line: { type: "none" },
  });

  // 링크들
  s.addText(
    [
      { text: "Live  ", options: { fontSize: 12, color: C.divider, bold: true } },
      {
        text: "bookmark-library-iota.vercel.app",
        options: { fontSize: 14, color: C.cream, fontFace: "Consolas" },
      },
    ],
    { x: 3.5, y: 2.95, w: 6.0, h: 0.4, fontFace: FONT, margin: 0 }
  );
  s.addText(
    [
      { text: "Repo  ", options: { fontSize: 12, color: C.divider, bold: true } },
      {
        text: "github.com/wodud17711/bookmark-library",
        options: { fontSize: 14, color: C.cream, fontFace: "Consolas" },
      },
    ],
    { x: 3.5, y: 3.5, w: 6.0, h: 0.4, fontFace: FONT, margin: 0 }
  );
  s.addText(
    [
      { text: "Contact  ", options: { fontSize: 12, color: C.divider, bold: true } },
      {
        text: "jaeyoung17711@gmail.com",
        options: { fontSize: 14, color: C.cream, fontFace: "Consolas" },
      },
    ],
    { x: 3.5, y: 4.05, w: 6.0, h: 0.4, fontFace: FONT, margin: 0 }
  );

  // 푸터
  s.addText("임재영 · 동성인재개발교육원 · 2026.05.18", {
    x: 3.5,
    y: 5.05,
    w: 6.0,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: C.textMuted,
    italic: true,
    margin: 0,
  });
}

// ===========================================================
// 발표자 노트 (speaker notes) — 슬라이드별 talking points
// pres.slides 배열의 i번째에 직접 addNotes
// ===========================================================
const notes = [
  // 1 — 표지
  `[0:00-0:30 / 30초]
인사 + 자기소개.
"안녕하세요, 임재영입니다. 오늘 발표할 프로젝트는 '북마크 도서관'입니다."
부제 한 번 더 짚어주기:
"내 북마크가 한 권의 책이 된다면, 이라는 가설로 시작한 풀스택 프로젝트입니다."`,

  // 2 — 훅
  `[0:30-1:00 / 30초]
청중과 눈 마주치며 질문 던지기. 답을 기다리지 말고 한 박자 쉬고 다음 슬라이드로.
"여러분 북마크 폴더 마지막으로 정리한 게 언제인가요?"
"저는 한 5년 됐고, 그 사이 600개가 쌓였습니다."`,

  // 3 — 문제
  `[1:00-1:45 / 45초]
좌측 카드 — "지금의 북마크는 일렬 나열식 폴더입니다. 많아질수록 못 찾고, 봐도 뿌듯한 게 없습니다."
우측 카드 강조 — "그런데 사람은 잘 정리된 책장을 보면 뿌듯해 하잖아요. 그 감정을 북마크 관리에 입혀보자가 출발점입니다."
이게 발표 전체의 핵심 메시지: "기능 위에 감정 한 겹을 얹으면 사용자가 달라진다."`,

  // 4 — 컨셉
  `[1:45-2:30 / 45초]
좌측 매핑 3개를 차례로 짚기 — "북마크는 책 / 폴더는 책장 / 사용자는 도서관."
우측 스크린샷 가리키며 — "이게 실제 화면입니다. 위에서 내려다보는 평면도예요. 좌우 벽에 책장, 가운데 가게는 베스트셀러 자리, 아래쪽이 입구입니다. 마지막에 실제로 보여드릴게요."
"왜 굳이 평면도냐, 는 뒤에서 설명드리겠습니다." (다음 슬라이드로 자연 전환)`,

  // 5 — 북극성
  `[2:30-3:15 / 45초]
큰 인용구를 천천히 읽기. "이 한 문장이 모든 결정의 기준이 됐습니다."
"성공 지표는 사용자 수가 아니라, 꾸미고 자랑하고 싶어지는가."
계보 chips — "이 제품은 싸이월드 미니홈피, 노션, 핀터레스트 같은 '꾸미고 보여주는 서비스' 계보에 있습니다. 단순한 도구가 아니에요."
청중 연령에 맞춰 싸이월드 또는 노션 중 하나 강조.`,

  // 6 — 의도된 제약
  `[3:15-4:00 / 45초]
큰 숫자 3개 — "사용자당 도서관 3개, 도서관당 책장 8개, 책장당 책 30권. 일부러 한도를 둡니다."
"무제한이면 단순한 보관함이 되거든요. 한도가 있어야 '큐레이션'이 됩니다."
"한도가 넘는 북마크는 '창고'라는 별도 공간에 무제한 보관합니다. 데이터는 안 잃으면서 도서관은 깨끗하게."`,

  // 7 — 두 질문 룰
  `[4:00-4:45 / 45초]
"기능을 추가할지 말지 고민될 때마다, 이 두 질문을 통과시킵니다."
Q1, Q2 차례로 짚기.
"이 덕분에 '자동 정렬 기능 넣어주세요' 같은 합리적으로 보이는 요청을 거절할 수 있었어요. 자동 정렬은 '직접 꾸민다'는 이 제품의 핵심 컨셉과 충돌하니까요."
"비전이 명확하면 결정이 단순해진다 — 마지막 슬라이드에서 다시 짚을 거예요."`,

  // 8 — 아키텍처
  `[4:45-5:30 / 45초]
4박스를 좌→우로 흐름 짚기.
"사용자가 브라우저로 접속하면, 화면은 Vercel이라는 곳에서 띄워주고, 로직은 Railway라는 곳에서 Spring Boot 서버가 처리합니다. 데이터는 PostgreSQL에 저장하고, AI 분류는 구글 Gemini를 씁니다."
하단 3패턴 — "이 중 흥미로운 결정 몇 가지를 다음 슬라이드부터 자세히 보여드립니다."
가볍게 넘기는 슬라이드 — 다음부터가 본격 기술 파트.`,

  // 9 — 스택
  `[5:30-6:15 / 45초]
3컬럼 빠르게 짚기. 모든 항목 다 읽지 않아도 됨.
"백엔드는 학원에서 배운 Spring Boot 기반, 프론트엔드는 React, 그리고 무료 호스팅 서비스에 올렸습니다. AI는 구글 Gemini 무료 모델을 썼고요."
"각 도구를 왜 골랐는지는 다음 결정 5개에서 자세히 설명드립니다."`,

  // 10 — 결정 1: 평면도 그리기
  `[6:15-7:00 / 45초]
"가장 먼저 결정해야 했던 게, 이 평면도를 어떻게 그릴지였습니다."
옵션 짚기 — "일반 HTML로 그리면 책 100권이 모바일에서 너무 느리고, SVG는 애니메이션 제어가 어렵고, 캔버스는 GPU 가속이 안 됩니다."
"그래서 Pixi.js라는 게임용 그래픽 라이브러리를 골랐습니다. 게임 엔진처럼 GPU를 써서 빠르고, 시간대 전환도 부드럽게 처리할 수 있어요."
"이번 주 외부 디자이너랑 협업해서 평면도 비주얼을 전면 리뉴얼했습니다. 데모에서 시간대 전환 부분 보여드리면 임팩트 있을 거예요."`,

  // 11 — 결정 2: 배포 후 로그인 버그
  `[7:00-7:45 / 45초]
"운영 환경에 배포한 직후에 가장 인상적인 버그가 있었습니다."
"구글 로그인 자체는 잘 되는데, 마지막 단계에서 에러가 났어요. 알고 보니 화면 주소(vercel)와 서버 주소(railway)가 달라서, 로그인 정보가 화면 도메인에만 저장돼 서버에는 따라오지 못한 거였습니다."
"이런 에러는 학원에서 안 가르치는 종류라 한참 헤맸어요. 진단에 반나절 걸리고, 막상 픽스는 설정 한 줄이었습니다."`,

  // 12 — 결정 3: 공유 미리보기
  `[7:45-8:30 / 45초]
"디스코드나 카톡, 트위터에 주소를 붙이면 미리보기 카드가 뜨잖아요. 입소문에 굉장히 중요한 요소입니다."
"그런데 React로 만든 사이트는 봇이 와도 빈 화면으로 인식해서 미리보기가 안 떠요."
"해결: 봇만 따로 구분해서 미리보기용 화면을 따로 응답하고, 사람에게는 평소대로 React 사이트를 보여줍니다."
"이렇게 하면 SNS 봇은 미리보기 카드를 받고, 사람 사용자 경험은 그대로 유지됩니다."`,

  // 13 — 결정 4: 미리보기 이미지
  `[8:30-9:15 / 45초]
"모든 도서관이 같은 미리보기 이미지면, 친구가 받았을 때 '내 거다'라는 느낌이 안 나죠."
"옵션: 화면을 매번 캡처해서 저장하면 용량이 폭발하고, 요청 올 때마다 다시 그리면 느립니다."
"해결: 서버에서 도서관별로 책 색깔만 모아서 그리고, 5분 동안 메모리에 보관해서 같은 요청은 바로 응답합니다."
"본인 책 색깔이 미리보기에 그대로 들어가서, 친구가 봤을 때 '이게 네 거구나' 한 번에 알 수 있어요. 그리는 데 0.03초 걸립니다."`,

  // 14 — 결정 5: AI 자동 분류
  `[9:15-10:00 / 45초]
"크롬에서 북마크를 한 번에 91권 가져왔는데, 폴더명만 있고 책 제목·키워드·색깔 정보가 없었습니다. 91개를 손으로 다 손볼 수는 없죠."
"옵션: 유료 GPT는 비용이 있고, 무료 Gemini는 품질이 충분하고, 직접 규칙으로 분류하면 한계가 있습니다."
"구글 Gemini 무료 모델 선택. 사용자별로 분당 호출 횟수를 제한해서 무료 한도를 안 넘게 했고, AI 결과는 백그라운드에서 천천히 채워서 사용자는 기다림 없이 끝납니다."`,

  // 15 — 모바일
  `[10:00-10:45 / 45초]
"같은 코드 하나로 세 가지 화면 비율을 다 지원합니다. 데스크톱, 태블릿, 폰."
스크린샷 차례로 가리키며 — "왼쪽 데스크톱, 가운데 태블릿, 오른쪽 폰. 같은 도서관·같은 책장이지만, 화면 비율에 맞게 책장이 좌우 벽에 자연스럽게 배치되도록 분기해놨습니다."
"모바일에서 발견한 함정 두 가지가 오른쪽에 있는데:"
1. "모달이 열리자마자 닫히는 현상이 있었어요. 같은 손가락 터치가 모달 안 + 바깥을 동시에 인식해버려서요. 0.25초 동안 바깥 클릭 무시하도록 처리했습니다."
2. "마우스 올려야 보이는 버튼이 모바일에서는 영영 안 보이더라고요. 모바일은 항상 보이게 분기했습니다."`,

  // 16 — 배운 것
  `[10:45-11:30 / 45초]
세 가지 천천히 짚기.
1. "비전이 결정을 단순하게 만든다" — 두 질문 룰 덕분에 거절할 수 있었다.
2. "실패는 배포한 다음에 시작된다" — 로그인 버그, 메모리 부족 등 학원에서 안 다루는 환경 문제들.
3. "기능 위에 감정 한 겹을 얹는다" — 북마크 관리는 도구가 본업이지만, 그 위에 '꾸미는 재미'를 얹었습니다. 친구가 처음 써본 후 한 말이 "색깔 고르는 게 재밌다"였어요. 기능 칭찬이 아닌 감정 반응. 이게 북극성이 작동한 신호였습니다.
마무리: "이제 실제로 어떻게 작동하는지 보여드리겠습니다." → 데모로 자연 전환`,

  // 17 — DEMO (마지막 클라이맥스)
  `[11:30-18:30 / 약 7분]
※ 라이브 시연 — 발표의 클라이맥스 ※
앞에서 컨셉·북극성·결정 다 설명했으니, 여기서 "그래서 실제로 어떻게 보이는데?"에 답한다.

시연 순서 (단계당 약 1분 + 도입/마무리):
1. 로그인 페이지 → "이렇게 작동해요" 첫 안내 화면 짚기
2. 크롬 북마크 가져오기 → AI가 뒤에서 자동 분류 도는 거 보여주기
3. 책 색깔 고르기 → AI 추천 한 번 누르고, 직접 골라보고, 최근 색 기억 보여주기
4. 책 드래그로 순서 바꾸기 → 책 등 색띠 잡고 위치 변경 (가능하면 모바일도)
5. 본인 도서관 공유 주소를 디스코드 또는 카톡에 붙여서 미리보기 카드 확인

※ 시간 관리: 한 단계 오래 끌면 다음 단계 짧게 — 7분 안에 무조건 끝낸다.
※ 만약 라이브 시연 실패 시: "이미 슬라이드로 설명드렸으니 빠르게 마무리하겠습니다" → 다음 슬라이드로 넘어가기.
※ 끝낼 때: "여기까지가 실제 작동 모습입니다. 마지막 슬라이드로 마무리하겠습니다."`,

  // 18 — 감사
  `[18:30-20:00 / 1:30 + Q&A]
"감사합니다." — 짧고 명확히.
링크 3개가 보이도록 잠시 멈춰주기.
청중 질문이 들어오면 받기 (슬라이드에 "질문 받겠습니다" 명시 안 했지만, 발표자가 자연스럽게 "질문 있으시면 받겠습니다" 한 번 가능).

예상 질문 대비:
- "왜 Spring Boot인가요?" → 학원 커리큘럼 베이스 + 신규 메이저 버전 호환성까지 직접 검증한 경험 어필.
- "AI 비용은 어떻게 되나요?" → 구글 Gemini 무료 모델 사용. 호출 횟수 제한으로 한도 초과 방지.
- "혼자 다 만들었나요?" → 평면도 시각 디자인은 외부 디자이너와 협업, 코드·시스템 통합은 본인.
- "수익화 계획?" → DB 구조에 유료/무료 구분 필드만 미리 만들어뒀고, 결제 도입은 다음 버전 예정.`,
];

// 슬라이드 배열은 pres.slides에 push된 순서대로 들어있음
notes.forEach((note, i) => {
  if (pres.slides[i]) {
    pres.slides[i].addNotes(note);
  }
});

// ===========================================================
// 파일 저장
// ===========================================================
const outPath = path.join(__dirname, "북마크도서관_발표_v1.pptx");
pres.writeFile({ fileName: outPath }).then((p) => {
  console.log(`OK: ${p}`);
  console.log(`Slides: ${pres.slides.length}`);
});
