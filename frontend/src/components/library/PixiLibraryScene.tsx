import { useEffect, useRef, useState } from 'react'
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type FederatedPointerEvent,
} from 'pixi.js'
import type { Bookshelf, EntranceMood, Library } from '../../api/library'
import {
  floorPaletteFor,
  paletteFor,
  type FloorPalette,
  type ShelfPalette,
} from '../../utils/shelfThemes'
import { EntranceLight, type EntrancePresetName } from './entranceLight'

interface Props {
  library: Library
  favoritesCount: number
  storageCount: number
  privateCount: number
  onShelfClick: (bookshelfId: number) => void
  onEntranceClick: () => void
  onBestsellerClick: () => void
  onPrivateClick: () => void
  onStorageClick: () => void
  /**
   * Public-view mode: hides owner-only affordances (private door,
   * storage chip) and disables the entrance click. Set true when rendering
   * a shared library URL.
   */
  readonly?: boolean
}

// Below this viewport width the floor plan switches to a 9:16 portrait layout
// (pedestal moves above the shelves so it no longer competes with shelf width).
const MOBILE_BREAKPOINT = 600
// Tablets in portrait orientation (iPad mini ~768, iPad ~820, Galaxy Tab S7+
// ~1080) sit above MOBILE_BREAKPOINT but their canvas is still too narrow for
// the desktop landscape silhouette/shelf layout. Treat them as portrait when
// the device is held vertically. Cap at 1080 so external monitors with tall
// browser windows on a desktop don't accidentally trip the portrait branch.
const TABLET_PORTRAIT_MAX_WIDTH = 1080

type PortraitMode = 'phone' | 'tablet' | null

function detectPortraitMode(): PortraitMode {
  if (typeof window === 'undefined') return null
  if (window.innerWidth < MOBILE_BREAKPOINT) return 'phone'
  if (
    window.innerWidth < TABLET_PORTRAIT_MAX_WIDTH &&
    window.innerHeight > window.innerWidth
  ) {
    return 'tablet'
  }
  return null
}

/**
 * Top-down floor plan rendered with Pixi.js.
 *
 * Visual layers (back to front):
 *   1. Floor: tiled wood plank pattern across the ENTIRE canvas
 *   2. Subtle wall borders on the canvas edges
 *   3. Decorative plant in a corner
 *   4. Bookshelves (shelf palette) standing on the floor with shadows
 *   5. Bestseller pedestal + rug in center
 *   6. Private door at the bottom edge
 *   7. Entrance light spill onto floor
 *   8. Entrance glow + door frame at top (no label — light reads as entrance)
 *   9. Storage chip in top corner
 */
export function PixiLibraryScene(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)
  // Long-lived light instance — ticker callback + dust particles persist across
  // re-renders. drawScene tears it down + recreates so the canvas wipe pattern
  // (stage.removeChildAt loop) doesn't leave a stale ticker handler running.
  const entranceLightRef = useRef<EntranceLight | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  // Three layouts: phone (9:16, tall narrow), tablet portrait (5:7, near-square),
  // landscape desktop (16:9). drawScene infers portrait branch from H > W on
  // the canvas itself, so phone and tablet share internal layout — only the
  // host's aspect ratio differs.
  const [portraitMode, setPortraitMode] = useState<PortraitMode>(detectPortraitMode)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setPortraitMode(detectPortraitMode())
    window.addEventListener('resize', update)
    // Some tablets fire orientationchange before the layout viewport updates;
    // listen explicitly so the swap is responsive to physical rotation.
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    const setup = async () => {
      const floor = floorPaletteFor(propsRef.current.library.floorPaletteName)
      const app = new Application()
      await app.init({
        background: floor.primary,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        width: host.clientWidth || 800,
        height: host.clientHeight || 480,
      })
      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }
      appRef.current = app
      host.appendChild(app.canvas)
      app.canvas.style.display = 'block'
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'
      // Pixi 8 sets touch-action: none on the canvas by default, which blocks
      // vertical page scroll when a touch starts inside the floor plan. Allow
      // browser-handled vertical pan while still letting Pixi receive taps.
      app.canvas.style.touchAction = 'pan-y'

      drawScene(app, propsRef.current, entranceLightRef)

      resizeObserver = new ResizeObserver(() => {
        const a = appRef.current
        if (!a || cancelled) return
        const w = host.clientWidth
        const h = host.clientHeight
        if (w === 0 || h === 0) return
        a.renderer.resize(w, h)
        drawScene(a, propsRef.current, entranceLightRef)
      })
      resizeObserver.observe(host)
    }

    setup()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      if (entranceLightRef.current) {
        entranceLightRef.current.destroy()
        entranceLightRef.current = null
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const a = appRef.current
    if (!a) return
    drawScene(a, propsRef.current, entranceLightRef)
  }, [
    props.library,
    props.favoritesCount,
    props.storageCount,
    props.privateCount,
  ])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-(--radius-lg) overflow-hidden border border-(--color-line) shadow-(--shadow-md)"
      style={
        portraitMode === 'phone'
          ? { aspectRatio: '9 / 16', minHeight: 520, maxHeight: '85vh' }
          : portraitMode === 'tablet'
            ? // Near-square — full 9:16 on tablet would clip into 85vh anyway,
              // and a 5:7 source ratio reads better when content (shelves +
              // pedestal + silhouettes) needs both vertical and horizontal room.
              { aspectRatio: '5 / 7', minHeight: 600, maxHeight: '78vh' }
            : { aspectRatio: '16 / 9', minHeight: 440, maxHeight: 680 }
      }
    />
  )
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const PADDING = 32
const ENTRANCE_HEIGHT = 60
const PRIVATE_DOOR_WIDTH = 110
const PRIVATE_DOOR_HEIGHT = 50
const PRIVATE_BOTTOM_OFFSET = 18 // door sits this far from canvas bottom
const PEDESTAL_WIDTH = 200
const PEDESTAL_HEIGHT = 110
const MAX_SHELF_WIDTH = 130
// Gap must clear: shelf-below capacity (~12px) + shelf-above label (~14px) + breathing room.
const SHELF_GAP = 32
const SIDE_WALL_WIDTH = 150

// Vertical band reserved for the pedestal in portrait mode (pedestal h + label + breathing).
const PORTRAIT_PEDESTAL_BAND = 120
const PORTRAIT_PEDESTAL_WIDTH = 160
const PORTRAIT_PEDESTAL_HEIGHT = 78
const PORTRAIT_MAX_SHELF_WIDTH = 100
const PORTRAIT_SIDE_WALL_WIDTH = 120
// In portrait the central aisle between left/right shelf columns is only ~96px,
// so the door must be narrow enough to clear shelf inner edges.
const PORTRAIT_PRIVATE_DOOR_WIDTH = 76

interface ShelfBox {
  shelf: Bookshelf
  x: number
  y: number
  w: number
  h: number
  side: 'left' | 'right'
}

// ─────────────────────────────────────────────────────────────────
// Scene
// ─────────────────────────────────────────────────────────────────

function drawScene(
  app: Application,
  p: Props,
  entranceLightRef: { current: EntranceLight | null }
) {
  const shelf = paletteFor(p.library.paletteName)
  const floor = floorPaletteFor(p.library.floorPaletteName)
  const stage = app.stage

  // Tear down the previous EntranceLight first so its ticker handler is
  // unregistered before the stage wipe destroys its child graphics. Otherwise
  // the ticker would tick once on a half-destroyed sprite tree.
  if (entranceLightRef.current) {
    entranceLightRef.current.destroy()
    entranceLightRef.current = null
  }

  while (stage.children.length > 0) {
    const c = stage.removeChildAt(0)
    c.destroy({ children: true })
  }
  app.renderer.background.color = floor.primary

  const W = app.renderer.width
  const H = app.renderer.height
  // Internal portrait branch: the host's aspectRatio has already flipped to 9:16
  // by the time ResizeObserver fires drawScene, so H > W is enough.
  const portrait = H > W

  drawFloor(stage, W, H, floor)
  drawWallBorders(stage, W, H, floor)
  drawSilhouettes(stage, W, H, p.library, floor, portrait)

  const publicShelves = p.library.bookshelves.filter((s) => s.zone === 'PUBLIC')
  const boxes = layoutShelves(publicShelves, W, H, portrait)
  for (const box of boxes) drawBookshelf(stage, box, shelf, floor, p.onShelfClick)

  drawBestsellerPedestal(stage, W, H, shelf, floor, p, portrait)
  if (!p.readonly) {
    drawPrivateDoor(stage, W, H, shelf, floor, p, portrait)
  }

  // Window frame at the top — gives the entrance light a tangible source so
  // it reads as "sunlight through a window" instead of an unexplained glow.
  // Sits BELOW the ambient overlay so it tints with the time-of-day mood.
  //
  // Window pane is intentionally NARROWER than the light spill below — the
  // 1:1 frame-to-light match looked overpowering. Now the cone reads as light
  // pouring out and spilling sideways past the frame edges.
  const windowFrameW = portrait
    ? Math.min(W * 0.42, 220)
    : Math.min(W * 0.24, 320)
  const windowFrameY = 4
  // Thinner window — reference photos show frame height ~10% of width,
  // almost rectangular (only slightly rounded corners). 16px was chunky.
  const windowFrameH = 9
  drawEntranceWindow(stage, W, windowFrameW, windowFrameY, windowFrameH)

  // Build the natural-light layers: cone + hotspot + dust around the entrance,
  // plus a MULTIPLY ambient overlay that tints the whole canvas to the
  // time-of-day mood. Ticker callback drives flicker + dust + lerp.
  //
  // y starts at the window's bottom edge (light pours out of the frame).
  // windowWidth is INTENTIONALLY larger than the frame's pane — the light
  // spill is wider than the window so it reads as sunlight scattering past
  // the frame edges (matches reference photo).
  const light = new EntranceLight(app, {
    x: W / 2,
    y: windowFrameY + windowFrameH,
    windowWidth: portrait ? Math.min(280, W * 0.50) : Math.min(350, W * 0.30),
    maxReach: Math.min(H * 0.88, 560),
    dustCount: portrait ? 24 : 32,
  })
  // Z-order matters: ambient (MULTIPLY) MUST be added BEFORE the cone container.
  // Pixi addChild is LIFO so the later child paints on top. If ambient sits
  // above cone, the cone's additive light gets multiplied back down into the
  // dark mood tint — the entrance light disappears into the brown wash. With
  // ambient below, it tints everything painted up to this point (floor,
  // shelves, pedestal) but the cone/hotspot/dust draw cleanly on top.
  stage.addChild(light.ambientLayer)
  stage.addChild(light.container)
  light.setPreset(moodToPresetName(p.library.entranceMood), true)
  light.attachTicker()
  entranceLightRef.current = light

  // Invisible click hit area for the entrance — replaces the old drawEntrance
  // interactive container. Added LAST so it sits on top of cone/ambient and
  // catches taps without being visually affected.
  drawEntranceHitArea(stage, W, p)

  if (!p.readonly) {
    drawStorage(stage, W, floor, p)
  }

  if (publicShelves.length === 0 && p.favoritesCount === 0) {
    drawEmptyMessage(stage, W, H, floor)
  }
}

function moodToPresetName(mood: EntranceMood): EntrancePresetName {
  switch (mood) {
    case 'DAY':     return 'day'
    case 'EVENING': return 'evening'
    case 'NIGHT':   return 'night'
  }
}

// ─── Floor (covers entire canvas) ───────────────────────

/**
 * 깔끔한 일러스트풍 마루 — 가로 판자(plank) staggered brick layout.
 *
 * 디자인 노트:
 *   - 톤은 base 비중을 압도적으로 높여서 (3:1:1) 얼룩진 느낌 제거.
 *   - ±6% lightness 만 사용해 변주가 눈에 거슬리지 않음.
 *   - 판자 폭/높이를 키워 (160~280 × 36) "너른 마루" 인상.
 *   - 옹이/결무늬 등 추가 노이즈 없음 — 카툰풍을 피함.
 *   - 모든 도형을 단일 Graphics 로 배칭 → 수십~수백 개 child 안 만듦.
 *   - deterministic — 같은 (rowSeed, boardIdx)는 항상 같은 톤/너비.
 */
function drawFloor(stage: Container, W: number, H: number, floor: FloorPalette): void {
  const plankH = 36
  const minBoardW = 160
  const maxBoardW = 280
  const planks = Math.ceil(H / plankH) + 1

  // 3톤 (base 비중 3:1:1, ±6% 미세 변주)
  const tones: string[] = [
    floor.primary,
    floor.primary,
    floor.primary,
    lighten(floor.primary, 0.06),
    darken(floor.primary, 0.06),
  ]
  const sheen = lighten(floor.primary, 0.12)

  // 모든 판자/솔기/광택을 단일 Graphics 에 배칭 — child 수 최소화
  const g = new Graphics()

  for (let i = 0; i < planks; i++) {
    const y = i * plankH
    const rowSeed = i * 9301 + 49297
    // 짝수 행은 그대로, 홀수 행은 보드 폭의 약 반만큼 좌측 시프트 (brick stagger)
    const rowOffset = (i & 1) ? -Math.floor(maxBoardW / 2) : 0

    let x = rowOffset
    let boardIdx = 0
    while (x < W) {
      // 보드 폭 160~280 — rowSeed × boardIdx 해시로 분포
      const widthHash = (rowSeed * (boardIdx * 31 + 7)) & 0xff
      const boardW = minBoardW + (widthHash % (maxBoardW - minBoardW))
      const drawX = Math.max(0, x)
      const drawW = Math.min(W, x + boardW) - drawX
      if (drawW <= 0) {
        x += boardW
        boardIdx++
        continue
      }

      // 본체
      const toneIdx = Math.abs((rowSeed ^ (boardIdx * 2654435761)) >>> 0) % tones.length
      g.rect(drawX, y, drawW, plankH).fill({ color: tones[toneIdx], alpha: 1 })

      // 상단 1px 미세 광택 (창문 빛 받는 면)
      g.rect(drawX, y, drawW, 1).fill({ color: sheen, alpha: 0.18 })

      // 우측 세로 솔기 (보드 우측 끝)
      const rightEdge = x + boardW
      if (rightEdge < W) {
        g.rect(rightEdge - 1, y, 1, plankH).fill({ color: floor.shadow, alpha: 0.55 })
      }

      x += boardW
      boardIdx++
    }

    // 행 사이 가로 솔기
    g.rect(0, y + plankH - 1, W, 1).fill({ color: floor.shadow, alpha: 0.5 })
  }

  stage.addChild(g)
}

// ─── Wall borders (subtle dark line at canvas edges) ────

function drawWallBorders(stage: Container, W: number, H: number, floor: FloorPalette) {
  const accent = darken(floor.primary, 0.35)
  const wall = new Graphics()
  wall.rect(0, 0, W, 4).fill({ color: accent, alpha: 0.45 })
  wall.rect(0, 0, 4, H).fill({ color: accent, alpha: 0.35 })
  wall.rect(W - 4, 0, 4, H).fill({ color: accent, alpha: 0.35 })
  wall.rect(0, H - 4, W, 4).fill({ color: accent, alpha: 0.35 })
  stage.addChild(wall)
}

// ─── Entrance window frame ──────────────────────────────
//
// A rounded "skylight" at the top edge of the canvas — gives the EntranceLight
// cone a visible source. Without it the natural-light layers look like an
// unexplained glow; with it the room reads as having a window above the door.
//
// Drawn BEFORE the ambient overlay so it picks up the time-of-day mood tint
// (frame darkens at night, warms at evening). Pure decoration — no events.

function drawEntranceWindow(
  stage: Container,
  W: number,
  windowW: number,
  windowY: number,
  windowH: number,
) {
  const windowX = (W - windowW) / 2
  // Mostly rectangular — reference photos have only a hint of corner rounding.
  const radius = 3

  // Outer frame (darker, sits ~2px outside the inner pane)
  const frame = new Graphics()
  frame
    .roundRect(windowX - 2, windowY - 2, windowW + 4, windowH + 4, radius + 2)
    .fill({ color: 0x2A1810, alpha: 0.95 })
  stage.addChild(frame)

  // Inner pane — slightly lighter than the frame so the rounded-rect inset
  // reads as a real frame depth. Cone/hotspot from EntranceLight will paint
  // additively on top, lighting up the pane.
  const inner = new Graphics()
  inner
    .roundRect(windowX, windowY, windowW, windowH, radius)
    .fill({ color: 0x4A3220, alpha: 0.85 })
  stage.addChild(inner)
}

// ─── Entrance click hit area ────────────────────────────
//
// Visual entrance light is now rendered by EntranceLight (see entranceLight.ts)
// — five blended layers (ambient / cone / rays / hotspot / dust) with a live
// ticker. The interactive hit area is kept separate so the cinematic light
// layers don't have to absorb pointer events.

function drawEntranceHitArea(stage: Container, W: number, p: Props) {
  if (p.readonly) return
  const lightW = Math.min(300, W * 0.42)
  const lightX = (W - lightW) / 2

  const hit = new Graphics()
  // Fully transparent rectangle — visually invisible but Graphics' hit testing
  // still picks up taps over the filled region. Sits above the ambient overlay
  // so it always receives the entrance tap.
  hit.rect(lightX, 0, lightW, ENTRANCE_HEIGHT).fill({ color: 0xFFFFFF, alpha: 0 })
  hit.eventMode = 'static'
  hit.cursor = 'pointer'
  hit.on('pointertap', (e: FederatedPointerEvent) => {
    e.stopPropagation()
    p.onEntranceClick()
  })
  stage.addChild(hit)
}

// ─── Bookshelf layout + draw ────────────────────────────

function layoutShelves(
  shelves: Bookshelf[],
  W: number,
  H: number,
  portrait: boolean,
): ShelfBox[] {
  const left: Bookshelf[] = []
  const right: Bookshelf[] = []
  shelves.forEach((s, i) => (i % 2 === 0 ? left.push(s) : right.push(s)))

  const sideWallWidth = portrait ? PORTRAIT_SIDE_WALL_WIDTH : SIDE_WALL_WIDTH
  const maxShelfWidth = portrait ? PORTRAIT_MAX_SHELF_WIDTH : MAX_SHELF_WIDTH
  // In portrait, the pedestal lives in a band directly under the entrance, so
  // shelf rows must start below it. Landscape leaves the entire wall available.
  const topReserved = ENTRANCE_HEIGHT + (portrait ? PORTRAIT_PEDESTAL_BAND : 0)
  const usableTop = topReserved + PADDING
  const usableBottom = H - PRIVATE_DOOR_HEIGHT - PRIVATE_BOTTOM_OFFSET - PADDING / 2
  const usableHeight = usableBottom - usableTop
  const wallSlots = Math.max(left.length, right.length)
  const slotHeight =
    (usableHeight - SHELF_GAP * Math.max(0, wallSlots - 1)) / Math.max(1, wallSlots)
  // Portrait: no minimum so shelves always fit within usableHeight (preventing
  // the last row from overflowing into the private door area). Cap at 100 to keep
  // the visual lighter than landscape.
  // Landscape: keep prior min/max so shelves look full-bodied.
  const shelfH = portrait
    ? Math.max(36, Math.min(100, slotHeight))
    : Math.min(140, Math.max(56, slotHeight))
  const shelfW = Math.min(maxShelfWidth, sideWallWidth - 20)

  const boxes: ShelfBox[] = []
  const buildSide = (arr: Bookshelf[], side: 'left' | 'right') => {
    arr.forEach((shelf, i) => {
      const x = side === 'left' ? PADDING : W - PADDING - shelfW
      const y = usableTop + i * (shelfH + SHELF_GAP)
      boxes.push({ shelf, x, y, w: shelfW, h: shelfH, side })
    })
  }
  buildSide(left, 'left')
  buildSide(right, 'right')
  return boxes
}

// ── 베이크된 백패널 텍스처 캐시 (theme + size 기준) ─────────────────
// 같은 theme + size 라면 한 번만 베이크해서 모든 책장이 공유.
// 빈 선반도 wood grain 결무늬가 보이도록 Canvas 에 굵은 결 + 미세 결 +
// 비네팅 + 상단 광택을 베이크한 후 PIXI Texture 로 캐싱.
const __backTexCache = new Map<string, Texture>()

function getBackPanelTexture(shelf: ShelfPalette, w: number, h: number): Texture {
  const key = `${shelf.wood}_${shelf.shadow}_${w}x${h}`
  const cached = __backTexCache.get(key)
  if (cached) return cached

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!

  // 1) base 색
  ctx.fillStyle = shelf.wood
  ctx.fillRect(0, 0, w, h)

  // 2) 가로 결무늬 — deterministic RNG (color 기반)
  let seed = 0
  const sig = shelf.wood + shelf.shadow
  for (let i = 0; i < sig.length; i++) seed = (seed * 31 + sig.charCodeAt(i)) | 0
  seed = Math.abs(seed) || 1
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    if (seed < 0) seed += 233280
    return seed / 233280
  }

  // 미세한 가로 줄 (어두운 결)
  for (let y = 0; y < h; y++) {
    const r = rnd()
    if (r < 0.35) {
      ctx.fillStyle = shelf.shadow
      ctx.globalAlpha = 0.06 + rnd() * 0.08
      ctx.fillRect(0, y, w, 1)
    } else if (r < 0.50) {
      ctx.fillStyle = '#FFFFFF'
      ctx.globalAlpha = 0.04 + rnd() * 0.05
      ctx.fillRect(0, y, w, 1)
    }
  }
  ctx.globalAlpha = 1

  // 굵은 결 4~5줄 — 곡선처럼 살짝 변조
  for (let i = 0; i < 5; i++) {
    const yBase = Math.floor(rnd() * h)
    ctx.fillStyle = shelf.shadow
    ctx.globalAlpha = 0.10 + rnd() * 0.10
    for (let x = 0; x < w; x++) {
      const dy = Math.round(Math.sin(x * 0.07 + i) * 1.2)
      ctx.fillRect(x, yBase + dy, 1, 1)
    }
  }
  ctx.globalAlpha = 1

  // 3) 안쪽 비네팅 (중앙은 밝게, 모서리는 어둡게)
  const grad = ctx.createRadialGradient(
    w / 2, h * 0.4, Math.min(w, h) * 0.1,
    w / 2, h / 2,   Math.max(w, h) * 0.75,
  )
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // 4) 상단 가벼운 광택 (창문 빛 받는 면)
  const topShine = ctx.createLinearGradient(0, 0, 0, h * 0.35)
  topShine.addColorStop(0, 'rgba(255,255,255,0.10)')
  topShine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = topShine
  ctx.fillRect(0, 0, w, h * 0.35)

  const tex = Texture.from(c)
  __backTexCache.set(key, tex)
  return tex
}

/**
 * 책장 한 개 그리기 — 안쪽 백패널에 베이크된 wood grain 텍스처.
 * 빈 선반도 결무늬가 보여서 시각적으로 살아남.
 */
function drawBookshelf(
  stage: Container,
  box: ShelfBox,
  shelf: ShelfPalette,
  floor: FloorPalette,
  onShelfClick: (id: number) => void,
): void {
  const { shelf: data, x, y, w, h } = box
  const container = new Container()
  container.x = x + w / 2
  container.y = y + h / 2
  container.pivot.set(w / 2, h / 2)
  container.eventMode = 'static'
  container.cursor = 'pointer'

  // 프레임/디테일/책 = 단일 Graphics 배칭
  const g = new Graphics()

  // 1. 발치 그림자
  g.roundRect(3, 5, w, h, 6).fill({ color: '#000000', alpha: 0.22 })

  // 2. (옵션) 산업용 metal frame
  if (shelf.frame) {
    g.roundRect(-3, -3, w + 6, h + 6, 4).fill(shelf.frame)
    g.rect(-2, -2, w + 4, 1).fill({ color: lighten(shelf.frame, 0.30), alpha: 0.7 })
    g.rect(w + 2, -1, 1, h + 3).fill({ color: darken(shelf.frame, 0.40), alpha: 0.8 })
  }

  // 3. wood 본체 (프레임 색 — 인셋 위에서 안쪽 텍스처가 보임)
  g.roundRect(0, 0, w, h, 5).fill(shelf.wood)
  // wood 상/우/하 edge 음영
  g.rect(1, 1, w - 2, 1).fill({ color: lighten(shelf.wood, 0.20), alpha: 0.6 })
  g.rect(w - 1, 1, 1, h - 2).fill({ color: shelf.shadow, alpha: 0.5 })
  g.rect(1, h - 1, w - 2, 1).fill({ color: shelf.shadow, alpha: 0.7 })

  container.addChild(g)

  // 4. ★ 안쪽 백패널 — 베이크 wood grain Sprite (Graphics 위에 얹음)
  const innerPad = 6
  const innerW = w - innerPad * 2
  const innerH = h - innerPad * 2
  const back = new Sprite(getBackPanelTexture(shelf, innerW, innerH))
  back.x = innerPad
  back.y = innerPad
  container.addChild(back)

  // 5. 안쪽 inset 그림자 + 선반 + 책 = 또 다른 단일 Graphics
  const g2 = new Graphics()

  // 안쪽 inset (프레임이 만드는 깊이감 — 백패널 위로 얹힘)
  g2.rect(innerPad - 1, innerPad - 1, innerW + 2, 1.5).fill({ color: '#000000', alpha: 0.55 })
  g2.rect(innerPad - 1, innerPad,     1.2, innerH).fill({ color: '#000000', alpha: 0.35 })
  g2.rect(innerPad + innerW - 0.2, innerPad, 1.2, innerH).fill({ color: '#000000', alpha: 0.20 })

  // 6. 선반 4단 (top sheen + bottom shadow per row)
  const levels = 4
  const levelH = innerH / levels
  for (let lv = 0; lv < levels; lv++) {
    const ly = innerPad + lv * levelH
    g2.rect(innerPad, ly, innerW, 1.3).fill({ color: lighten(shelf.wood, 0.22), alpha: 0.6 })
  }
  for (let lv = 1; lv < levels; lv++) {
    const ly = innerPad + lv * levelH
    g2.rect(innerPad, ly - 2.5, innerW, 2).fill({ color: shelf.shadow, alpha: 0.55 })
  }

  // 7. 책 — book.coverColor 그대로, 위에 4-layer 디테일
  const booksPerLevel = Math.max(1, Math.floor(innerW / 12))
  const bookGap = 2
  const bookWidth = (innerW - bookGap * (booksPerLevel - 1)) / booksPerLevel
  const baselineH = levelH - 4

  data.books.forEach((book, idx) => {
    const lv = Math.floor(idx / booksPerLevel)
    if (lv >= levels) return
    const col = idx % booksPerLevel
    const variance = ((book.id * 17 + idx * 5) % 5) - 2
    const bh = Math.max(baselineH - 6, baselineH + variance)
    const bx = innerPad + col * (bookWidth + bookGap)
    const by = innerPad + lv * levelH + (levelH - bh) - 2

    const lighter = lighten(book.coverColor, 0.25)
    const darker  = darken(book.coverColor, 0.35)

    g2.rect(bx, by, bookWidth, bh).fill(book.coverColor)
    g2.rect(bx, by + 1, 0.9, bh - 2).fill({ color: lighter, alpha: 0.85 })
    g2.rect(bx + bookWidth - 1, by + 1, 0.9, bh - 2).fill({ color: darker, alpha: 0.7 })
    g2.rect(bx + 0.5, by, bookWidth - 1, 1).fill({ color: lighter, alpha: 0.5 })
    g2.rect(bx, by + bh, bookWidth, 1).fill({ color: '#000000', alpha: 0.45 })
  })

  container.addChild(g2)

  // 8. Title label
  const label = new Text({
    text: data.title,
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 11,
      fontWeight: '700',
      fill: invertReadable(floor.primary),
      align: 'center',
    },
  })
  label.anchor.set(0.5, 0)
  label.x = w / 2
  label.y = h + 6
  container.addChild(label)

  // 9. Capacity
  const cap = new Text({
    text: `${data.books.length} / ${data.maxBooks}`,
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 9,
      fontWeight: '700',
      fill: invertReadable(floor.primary),
    },
  })
  cap.anchor.set(1, 1)
  cap.x = w
  cap.y = -4
  cap.alpha = 0.7
  container.addChild(cap)

  container.on('pointerover', () => container.scale.set(1.04))
  container.on('pointerout',  () => container.scale.set(1.0))
  container.on('pointertap', (e: FederatedPointerEvent) => {
    e.stopPropagation()
    onShelfClick(data.id)
  })
  stage.addChild(container)
}

// ─── Bestseller pedestal ────────────────────────────────

function drawBestsellerPedestal(
  stage: Container,
  W: number,
  H: number,
  shelf: ShelfPalette,
  floor: FloorPalette,
  p: Props,
  portrait: boolean,
) {
  if (p.favoritesCount === 0) return
  const cx = W / 2
  // Portrait: tucked into the reserved band just below the entrance so the
  // shelves can claim the full left/right walls.
  // Landscape: classic centered placement between entrance and private door.
  const cy = portrait
    ? ENTRANCE_HEIGHT + PORTRAIT_PEDESTAL_BAND / 2
    : (ENTRANCE_HEIGHT + (H - PRIVATE_DOOR_HEIGHT - PRIVATE_BOTTOM_OFFSET)) / 2 - 10
  const w = portrait ? PORTRAIT_PEDESTAL_WIDTH : PEDESTAL_WIDTH
  const h = portrait ? PORTRAIT_PEDESTAL_HEIGHT : PEDESTAL_HEIGHT

  // Rug under the pedestal — uses shelf wood so it relates to the bookshelves
  const rug = new Graphics()
  const rugW = w + 60
  const rugH = h + 30
  rug
    .roundRect(cx - rugW / 2, cy - rugH / 2 + 12, rugW, rugH, 16)
    .fill({ color: shelf.wood, alpha: 0.5 })
  rug
    .roundRect(cx - rugW / 2 + 6, cy - rugH / 2 + 18, rugW - 12, rugH - 12, 12)
    .stroke({
      color: invertReadable(floor.primary),
      alpha: 0.18,
      width: 1,
    })
  stage.addChild(rug)

  const container = new Container()
  container.x = cx
  container.y = cy
  container.pivot.set(w / 2, h / 2)
  container.eventMode = 'static'
  container.cursor = 'pointer'

  const shadow = new Graphics()
  shadow.roundRect(4, 6, w, h - 18, 5).fill({ color: '#000', alpha: 0.2 })
  container.addChild(shadow)

  const top = new Graphics()
  top.roundRect(0, 0, w, h - 22, 5).fill({ color: shelf.wood, alpha: 0.97 })
  container.addChild(top)
  const topHi = new Graphics()
  topHi.rect(2, 2, w - 4, 1).fill({ color: '#FFFFFF', alpha: 0.22 })
  container.addChild(topHi)

  // Legs
  const legW = 10
  const legY = h - 22
  const legH = 22
  const leg1 = new Graphics()
  leg1.rect(6, legY, legW, legH).fill(shelf.shadow)
  const leg2 = new Graphics()
  leg2.rect(w - 6 - legW, legY, legW, legH).fill(shelf.shadow)
  container.addChild(leg1)
  container.addChild(leg2)

  // Books on top
  const visibleBooks = Math.min(8, p.favoritesCount)
  const bookSpacing = (w - 30) / 8
  const bookColors = ['#8B5A3C', '#A06B4A', '#6B4023', '#7A4F3A', '#A87F5C', '#5C3A2A']
  for (let i = 0; i < visibleBooks; i++) {
    const bookH = 28 + (i % 3) * 5
    const book = new Graphics()
    book
      .roundRect(15 + i * bookSpacing, h - 22 - bookH, bookSpacing - 3, bookH, 1)
      .fill(bookColors[i % bookColors.length])
    container.addChild(book)
  }

  // Refined gold star drawn with Graphics — replaces the prior ✨ emoji which felt
  // out of place against the otherwise hand-drawn floor plan.
  const starG = drawStar(w / 2, h - 22 - 56, 11, 4.6, '#D4A444')
  container.addChild(starG)

  const label = new Text({
    text: `베스트셀러 · ${p.favoritesCount}권`,
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 11,
      fill: invertReadable(floor.primary),
    },
  })
  label.anchor.set(0.5, 0)
  label.x = w / 2
  label.y = h + 4
  container.addChild(label)

  container.on('pointerover', () => container.scale.set(1.03))
  container.on('pointerout', () => container.scale.set(1.0))
  container.on('pointertap', (e: FederatedPointerEvent) => {
    e.stopPropagation()
    p.onBestsellerClick()
  })
  stage.addChild(container)
}

// ─── Private door (bottom edge) ─────────────────────────

function drawPrivateDoor(
  stage: Container,
  W: number,
  H: number,
  shelf: ShelfPalette,
  floor: FloorPalette,
  p: Props,
  portrait: boolean,
) {
  // Portrait: narrower so the door fits in the central aisle without clipping
  // the inner edges of the bottom-row shelves on both walls.
  const w = portrait ? PORTRAIT_PRIVATE_DOOR_WIDTH : PRIVATE_DOOR_WIDTH
  const h = PRIVATE_DOOR_HEIGHT
  const x = (W - w) / 2
  const y = H - h - PRIVATE_BOTTOM_OFFSET

  const container = new Container()
  container.x = x
  container.y = y
  container.eventMode = 'static'
  container.cursor = 'pointer'

  const shadow = new Graphics()
  shadow.roundRect(3, 4, w, h, 4).fill({ color: '#000', alpha: 0.25 })
  container.addChild(shadow)

  // Door panel uses the shelf wood (to feel related to bookshelves)
  const door = new Graphics()
  door.roundRect(0, 0, w, h, 4).fill(shelf.shadow)
  container.addChild(door)

  // Inner panel detail
  const panel = new Graphics()
  panel
    .roundRect(8, 6, w - 16, h - 12, 2)
    .stroke({
      color: invertReadable(shelf.shadow),
      alpha: 0.32,
      width: 1,
    })
  container.addChild(panel)

  // Door handle
  const handle = new Graphics()
  handle.circle(w - 14, h / 2, 2.5).fill({
    color: invertReadable(shelf.shadow),
    alpha: 0.75,
  })
  container.addChild(handle)

  // Portrait door is too narrow for the full Korean label, so show just the
  // padlock; the floor-plan position already reads as "private door".
  const lockText = portrait
    ? '🔒'
    : `🔒 프라이빗${p.privateCount > 0 ? ` · ${p.privateCount}` : ''}`
  const lock = new Text({
    text: lockText,
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 11,
      fill: invertReadable(shelf.shadow),
    },
  })
  lock.anchor.set(0.5, 0.5)
  lock.x = portrait ? w / 2 : w / 2 - 4
  lock.y = h / 2
  lock.alpha = 0.85
  container.addChild(lock)

  container.on('pointerover', () => container.scale.set(1.03))
  container.on('pointerout', () => container.scale.set(1.0))
  container.on('pointertap', (e: FederatedPointerEvent) => {
    e.stopPropagation()
    p.onPrivateClick()
  })
  stage.addChild(container)
  void floor
}

// ─── Storage chip (top-right corner) ────────────────────

function drawStorage(stage: Container, W: number, floor: FloorPalette, p: Props) {
  const w = 76
  const h = 30
  const x = W - 12 - w
  const y = 10

  const container = new Container()
  container.x = x + w / 2
  container.y = y + h / 2
  container.pivot.set(w / 2, h / 2)
  container.eventMode = 'static'
  container.cursor = 'pointer'

  const bg = new Graphics()
  bg.roundRect(0, 0, w, h, 6).fill({
    color: invertReadable(floor.primary),
    alpha: 0.12,
  })
  bg.roundRect(0, 0, w, h, 6).stroke({
    color: invertReadable(floor.primary),
    alpha: 0.28,
    width: 1,
  })
  container.addChild(bg)

  const label = new Text({
    text: `📦 창고 ${p.storageCount}`,
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 11,
      fill: invertReadable(floor.primary),
    },
  })
  label.anchor.set(0.5, 0.5)
  label.x = w / 2
  label.y = h / 2
  container.addChild(label)

  container.on('pointerover', () => container.scale.set(1.06))
  container.on('pointerout', () => container.scale.set(1.0))
  container.on('pointertap', (e: FederatedPointerEvent) => {
    e.stopPropagation()
    p.onStorageClick()
  })
  stage.addChild(container)
}

// ─── Empty state ────────────────────────────────────────

function drawEmptyMessage(stage: Container, W: number, H: number, floor: FloorPalette) {
  const msg = new Text({
    text: '책장이 비어있습니다.\n아래에서 + 새 책장 추가로 시작해보세요.',
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 14,
      fill: invertReadable(floor.primary),
      align: 'center',
    },
  })
  msg.anchor.set(0.5, 0.5)
  msg.x = W / 2
  msg.y = H / 2
  msg.alpha = 0.55
  stage.addChild(msg)
}

// ─── Silhouettes (gamification) ─────────────────────────

/**
 * Visitor count — 1 silhouette per BOOKS_PER_SILHOUETTE bookmarks, capped at
 * MAX_SILHOUETTES so the floor stays readable. 도서관 메타포: 책이 많아질수록
 * 도서관에 사람이 점점 모임.
 */
const BOOKS_PER_SILHOUETTE = 15
const MAX_SILHOUETTES = 10

function silhouetteCount(totalBooks: number): number {
  return Math.min(MAX_SILHOUETTES, Math.floor(totalBooks / BOOKS_PER_SILHOUETTE))
}

/**
 * Ten candidate visitor positions across the floor. Designed to LOOK
 * UNPLANNED — no left/right mirror pairs, no shared y-rows, no slot at
 * exactly center. Earlier versions used a symmetric ring around the pedestal
 * which read like a posed group photo when all 10 filled (heavy library);
 * now positions skew asymmetrically and span the full vertical range from
 * near-entrance to near-private-door. xR avoids the wall-shelf bands
 * (≤ 0.20 left, ≥ 0.80 right) and the pedestal column (~ 0.42–0.58).
 */
const SILHOUETTE_SLOTS: Array<{ xR: number; yR: number }> = [
  { xR: 0.24, yR: 0.38 }, // 1: upper-left central aisle (browsing)
  { xR: 0.76, yR: 0.62 }, // 2: mid-right, intentionally not paired with #1's y
  { xR: 0.42, yR: 0.22 }, // 3: near entrance, slightly off-center
  { xR: 0.68, yR: 0.30 }, // 4: between entrance and pedestal-east
  { xR: 0.30, yR: 0.66 }, // 5: southwest of pedestal
  { xR: 0.78, yR: 0.45 }, // 6: east flank (NOT at 0.50)
  { xR: 0.55, yR: 0.85 }, // 7: walking near bottom edge, right of center
  { xR: 0.36, yR: 0.85 }, // 8: bottom area, off-center-left
  { xR: 0.62, yR: 0.72 }, // 9: lower-east
  { xR: 0.26, yR: 0.50 }, // 10: pedestal-west flank (uneven height with #6)
]

/**
 * Portrait slots — xR is AISLE-RELATIVE (0 = just inside the left shelf, 1 =
 * just inside the right shelf), not canvas-relative. The actual pixel
 * position is computed in drawSilhouettes from the runtime aisle bounds.
 *
 * This way the same slot list works for narrow phone aisles (~110px) and
 * wide tablet aisles (~500px) without slots clipping into shelves on phones
 * or all stacking into a thin center column on tablets.
 *
 * yR is canvas-relative as before — span avoids the pedestal band at top
 * and the private door at bottom.
 */
const PORTRAIT_SILHOUETTE_SLOTS: Array<{ xR: number; yR: number }> = [
  { xR: 0.50, yR: 0.40 }, // upper aisle, center
  { xR: 0.28, yR: 0.50 }, // left of aisle
  { xR: 0.72, yR: 0.55 }, // right of aisle (asymmetric y)
  { xR: 0.45, yR: 0.62 },
  { xR: 0.62, yR: 0.70 },
  { xR: 0.22, yR: 0.74 },
  { xR: 0.78, yR: 0.80 },
  { xR: 0.50, yR: 0.84 },
  { xR: 0.36, yR: 0.90 },
  { xR: 0.65, yR: 0.90 },
]

function drawSilhouettes(
  stage: Container,
  W: number,
  H: number,
  library: Library,
  floor: FloorPalette,
  portrait: boolean,
) {
  const totalBooks = library.bookshelves.reduce((sum, s) => sum + s.books.length, 0)
  const count = silhouetteCount(totalBooks)
  if (count === 0) return

  const seed = library.id ?? 1
  const inkColor = invertReadable(floor.primary)
  const slots = portrait ? PORTRAIT_SILHOUETTE_SLOTS : SILHOUETTE_SLOTS

  // Portrait: aisle bounds in pixels so slot xR (0..1) maps onto the actual
  // walkable column between the left and right shelf walls. Phone narrow,
  // tablet wide — same slot list scales smoothly to either.
  let aisleStart = 0
  let aisleSpan = W
  if (portrait) {
    const shelfW = Math.min(PORTRAIT_MAX_SHELF_WIDTH, PORTRAIT_SIDE_WALL_WIDTH - 20)
    const buffer = 14
    aisleStart = PADDING + shelfW + buffer
    aisleSpan = W - PADDING - shelfW - buffer - aisleStart
  }

  // Portrait: tight jitter so figures stay clear of shelves. Scale by aisle
  // width so wide-aisle (tablet) gets more scatter than narrow-aisle (phone).
  // Landscape: large jitter so the 10 filled slots don't read as a designed ring.
  const jitterRangeX = portrait
    ? Math.min(20, Math.max(8, Math.floor(aisleSpan / 28)))
    : 44
  const jitterRangeY = portrait ? 16 : 36

  for (let i = 0; i < count; i++) {
    const slot = slots[i]
    // Deterministic per-library jitter so silhouettes feel placed, not perfectly aligned.
    const jitterX = ((seed * 17 + i * 31) % jitterRangeX) - jitterRangeX / 2
    const jitterY = ((seed * 13 + i * 19) % jitterRangeY) - jitterRangeY / 2
    const x = portrait
      ? aisleStart + slot.xR * aisleSpan + jitterX
      : W * slot.xR + jitterX
    const y = H * slot.yR + jitterY
    const facingRight = ((seed + i * 7) % 2) === 0
    drawSilhouette(stage, x, y, facingRight, inkColor)
  }
}

/** Single silhouette: small head + tapered body + thin legs + soft floor shadow. */
function drawSilhouette(
  stage: Container,
  x: number,
  y: number,
  facingRight: boolean,
  inkColor: string,
) {
  const c = new Container()
  c.x = x
  c.y = y
  if (!facingRight) c.scale.x = -1

  // Floor shadow (drawn first so figure sits on top)
  const shadow = new Graphics()
  shadow.ellipse(0, 12, 8, 2.5).fill({ color: '#000', alpha: 0.22 })
  c.addChild(shadow)

  // Body (slight trapezoid)
  const body = new Graphics()
  body
    .moveTo(-6.5, -22)
    .lineTo(6.5, -22)
    .lineTo(5, 6)
    .lineTo(-5, 6)
    .closePath()
    .fill({ color: inkColor, alpha: 0.55 })
  c.addChild(body)

  // Head
  const head = new Graphics()
  head.circle(0, -28, 5.5).fill({ color: inkColor, alpha: 0.6 })
  c.addChild(head)

  // Legs (two short lines)
  const legs = new Graphics()
  legs
    .moveTo(-2.5, 6).lineTo(-2.5, 12).stroke({ color: inkColor, width: 2.2, alpha: 0.5 })
  legs
    .moveTo(2.5, 6).lineTo(2.5, 12).stroke({ color: inkColor, width: 2.2, alpha: 0.5 })
  c.addChild(legs)

  stage.addChild(c)
}

// ─── Shape helpers ──────────────────────────────────────

/** Five-pointed star centered at (cx, cy). Filled with `color`; subtle inner highlight. */
function drawStar(cx: number, cy: number, outerR: number, innerR: number, color: string): Graphics {
  const g = new Graphics()
  const points = 5
  const path: number[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI * i) / points - Math.PI / 2
    path.push(cx + Math.cos(angle) * r)
    path.push(cy + Math.sin(angle) * r)
  }
  g.poly(path).fill({ color, alpha: 0.95 })
  // Subtle inner highlight for a polished feel
  const hiPath: number[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0 ? outerR : innerR) * 0.6
    const angle = (Math.PI * i) / points - Math.PI / 2
    hiPath.push(cx + Math.cos(angle) * r)
    hiPath.push(cy + Math.sin(angle) * r - 1) // slight upward offset for "lit from above" feel
  }
  g.poly(hiPath).fill({ color: '#FFFFFF', alpha: 0.18 })
  return g
}

// ─── Color helpers ──────────────────────────────────────

function invertReadable(hex: string): string {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return '#000000'
  const [r, g, b] = m.slice(0, 3).map((h) => parseInt(h, 16))
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.55 ? '#2A2520' : '#F5F1EA'
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const f = 1 - Math.max(0, Math.min(1, amount))
  return rgbToHex(Math.round(r * f), Math.round(g * f), Math.round(b * f))
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const f = Math.max(0, Math.min(1, amount))
  return rgbToHex(
    Math.round(r + (255 - r) * f),
    Math.round(g + (255 - g) * f),
    Math.round(b + (255 - b) * f),
  )
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function parseHex(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return [0, 0, 0]
  return m.slice(0, 3).map((h) => parseInt(h, 16)) as [number, number, number]
}
