import { useEffect, useRef, useState } from 'react'
import {
  Application,
  Container,
  Graphics,
  Text,
  type FederatedPointerEvent,
} from 'pixi.js'
import type { Bookshelf, EntranceMood, Library } from '../../api/library'
import {
  floorPaletteFor,
  paletteFor,
  type FloorPalette,
  type ShelfPalette,
} from '../../utils/shelfThemes'

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
  const propsRef = useRef(props)
  propsRef.current = props

  // Mobile portrait detection — drives both the host aspect-ratio (9:16 vs 16:9)
  // and the internal layout branch in drawScene. ResizeObserver re-runs drawScene
  // whenever the host changes size, so flipping the aspect-ratio re-renders the
  // floor plan in the new orientation automatically.
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsPortrait(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
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

      drawScene(app, propsRef.current)

      resizeObserver = new ResizeObserver(() => {
        const a = appRef.current
        if (!a || cancelled) return
        const w = host.clientWidth
        const h = host.clientHeight
        if (w === 0 || h === 0) return
        a.renderer.resize(w, h)
        drawScene(a, propsRef.current)
      })
      resizeObserver.observe(host)
    }

    setup()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const a = appRef.current
    if (!a) return
    drawScene(a, propsRef.current)
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
        isPortrait
          ? { aspectRatio: '9 / 16', minHeight: 520, maxHeight: '85vh' }
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

function drawScene(app: Application, p: Props) {
  const shelf = paletteFor(p.library.paletteName)
  const floor = floorPaletteFor(p.library.floorPaletteName)
  const stage = app.stage

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
  drawEntranceSpill(stage, W, floor, p)
  drawSilhouettes(stage, W, H, p.library, floor, portrait)

  const publicShelves = p.library.bookshelves.filter((s) => s.zone === 'PUBLIC')
  const boxes = layoutShelves(publicShelves, W, H, portrait)
  for (const box of boxes) drawBookshelf(stage, box, shelf, floor, p.onShelfClick)

  drawBestsellerPedestal(stage, W, H, shelf, floor, p, portrait)
  if (!p.readonly) {
    drawPrivateDoor(stage, W, H, shelf, floor, p, portrait)
  }
  drawEntrance(stage, W, floor, p)
  if (!p.readonly) {
    drawStorage(stage, W, floor, p)
  }

  if (publicShelves.length === 0 && p.favoritesCount === 0) {
    drawEmptyMessage(stage, W, H, floor)
  }
}

// ─── Floor (covers entire canvas) ───────────────────────

function drawFloor(stage: Container, W: number, H: number, floor: FloorPalette) {
  // Plank pattern across whole canvas. The `app.renderer.background` already
  // paints the primary color, so we just overlay the seams here.
  const plankH = 26
  const planks = Math.ceil(H / plankH) + 1
  for (let i = 0; i < planks; i++) {
    const y = i * plankH
    // Horizontal seam between planks
    const seam = new Graphics()
    seam.rect(0, y, W, 1).fill({ color: floor.shadow, alpha: 0.55 })
    stage.addChild(seam)

    // Vertical seams (between boards within a plank row), seeded for stability
    const seed = i * 9301 + 49297
    let pos = (seed % 220)
    while (pos < W) {
      const v = new Graphics()
      v.rect(pos, y + 2, 1, plankH - 4).fill({ color: floor.shadow, alpha: 0.4 })
      stage.addChild(v)
      pos += 80 + ((seed >> (i % 5)) % 140)
    }

    // Subtle horizontal grain wash on each plank
    const wash = new Graphics()
    wash.rect(0, y + 8, W, 1).fill({ color: floor.shadow, alpha: 0.1 })
    stage.addChild(wash)
  }
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

// ─── Entrance ───────────────────────────────────────────

function drawEntrance(stage: Container, W: number, floor: FloorPalette, p: Props) {
  const moodColor = entranceLightFor(p.library.entranceMood)
  const lightW = Math.min(300, W * 0.42)
  const lightX = (W - lightW) / 2

  const container = new Container()
  if (!p.readonly) {
    container.eventMode = 'static'
    container.cursor = 'pointer'
  }

  // Door frame band at the very top
  const frame = new Graphics()
  frame
    .roundRect(lightX - 4, 0, lightW + 8, 8, 2)
    .fill({ color: darken(floor.primary, 0.55), alpha: 0.65 })
  container.addChild(frame)

  // Glow core
  for (let i = 0; i < 14; i++) {
    const t = i / 14
    const g = new Graphics()
    const inset = t * 30
    g.rect(lightX + inset, 6, lightW - inset * 2, 4).fill({
      color: moodColor,
      alpha: 0.28 * (1 - t * 0.7),
    })
    container.addChild(g)
  }

  // Soft falloff
  for (let i = 0; i < 10; i++) {
    const t = i / 10
    const g = new Graphics()
    g.rect(lightX, 8 + t * (ENTRANCE_HEIGHT - 16), lightW, 6).fill({
      color: moodColor,
      alpha: 0.12 * (1 - t),
    })
    container.addChild(g)
  }

  if (!p.readonly) {
    let hover = false
    const drawHover = () => { container.alpha = hover ? 1.0 : 0.92 }
    drawHover()
    container.on('pointerover', () => { hover = true; drawHover() })
    container.on('pointerout', () => { hover = false; drawHover() })
    container.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation()
      p.onEntranceClick()
    })
  }
  stage.addChild(container)
}

function drawEntranceSpill(stage: Container, W: number, _floor: FloorPalette, p: Props) {
  const moodColor = entranceLightFor(p.library.entranceMood)
  const cx = W / 2
  // A single elongated pool of light just below the entrance.
  // Stacked translucent ellipses (outer → inner) accumulate to form a soft
  // radial falloff with no hard edges.
  const cy = ENTRANCE_HEIGHT + 28
  const layers = 20
  for (let i = layers - 1; i >= 0; i--) {
    const t = i / (layers - 1) // 1 = outermost (largest, faintest), 0 = innermost
    const rx = 55 + t * 105    // horizontal radius: ~55 inner → ~160 outer
    const ry = 26 + t * 44     // vertical radius: ~26 inner → ~70 outer
    const g = new Graphics()
    g.ellipse(cx, cy, rx, ry).fill({
      color: moodColor,
      alpha: 0.045 * (1 - t * 0.65),
    })
    stage.addChild(g)
  }
}

function entranceLightFor(mood: EntranceMood): string {
  switch (mood) {
    case 'DAY':     return '#FFE0A0'
    case 'EVENING': return '#E8865B'
    case 'NIGHT':   return '#7BA0D9'
  }
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

function drawBookshelf(
  stage: Container,
  box: ShelfBox,
  shelf: ShelfPalette,
  floor: FloorPalette,
  onShelfClick: (id: number) => void,
) {
  const { shelf: data, x, y, w, h } = box
  const container = new Container()
  container.x = x + w / 2
  container.y = y + h / 2
  container.pivot.set(w / 2, h / 2)
  container.eventMode = 'static'
  container.cursor = 'pointer'

  // Shadow on the floor underneath the shelf
  const shadow = new Graphics()
  shadow.roundRect(3, 5, w, h, 6).fill({ color: '#000', alpha: 0.22 })
  container.addChild(shadow)

  if (shelf.frame) {
    const frame = new Graphics()
    frame.roundRect(-3, -3, w + 6, h + 6, 4).fill(shelf.frame)
    container.addChild(frame)
  }

  // Wood backing
  const wood = new Graphics()
  wood.roundRect(0, 0, w, h, 5).fill(shelf.wood)
  container.addChild(wood)

  // Wood grain
  for (let i = 0; i < 4; i++) {
    const gx = 8 + i * (w - 16) / 3 + ((data.id * 13 + i * 7) % 6)
    const grain = new Graphics()
    grain.rect(gx, 4, 1, h - 8).fill({ color: shelf.shadow, alpha: 0.18 })
    container.addChild(grain)
  }

  // Top highlight
  const highlight = new Graphics()
  highlight.rect(2, 2, w - 4, 1).fill({ color: '#FFFFFF', alpha: 0.18 })
  container.addChild(highlight)

  // Shelf level dividers
  const levels = 4
  const innerPad = 6
  const innerW = w - innerPad * 2
  const levelH = (h - innerPad * 2) / levels
  for (let lv = 0; lv <= levels; lv++) {
    const ly = innerPad + lv * levelH
    const divider = new Graphics()
    divider.rect(innerPad, ly - 1, innerW, 2).fill(shelf.shadow)
    if (lv < levels) {
      const subShadow = new Graphics()
      subShadow.rect(innerPad, ly + 1, innerW, 1).fill({ color: '#000', alpha: 0.18 })
      container.addChild(subShadow)
    }
    container.addChild(divider)
  }

  // Books
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
    const bookGfx = new Graphics()
    bookGfx.rect(bx, by, bookWidth, bh).fill(book.coverColor)
    const spine = new Graphics()
    spine.rect(bx, by, 1, bh).fill({ color: '#FFFFFF', alpha: 0.18 })
    container.addChild(bookGfx)
    container.addChild(spine)
  })

  // Title label below
  const label = new Text({
    text: data.title,
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 11,
      fill: invertReadable(floor.primary),
      align: 'center',
    },
  })
  label.anchor.set(0.5, 0)
  label.x = w / 2
  label.y = h + 6
  container.addChild(label)

  // Capacity above
  const cap = new Text({
    text: `${data.books.length} / ${data.maxBooks}`,
    style: {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: 9,
      fill: invertReadable(floor.primary),
    },
  })
  cap.anchor.set(1, 1)
  cap.x = w
  cap.y = -4
  cap.alpha = 0.65
  container.addChild(cap)

  container.on('pointerover', () => container.scale.set(1.04))
  container.on('pointerout', () => container.scale.set(1.0))
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
 * Ten candidate positions arranged around the pedestal. Filled in this order
 * as the count grows, so 1~6 cluster near the pedestal and 7~10 spread out.
 */
const SILHOUETTE_SLOTS: Array<{ xR: number; yR: number }> = [
  // Inner cluster around the pedestal (filled first)
  { xR: 0.30, yR: 0.50 }, // 1: left-mid
  { xR: 0.70, yR: 0.50 }, // 2: right-mid
  { xR: 0.50, yR: 0.30 }, // 3: above pedestal
  { xR: 0.40, yR: 0.78 }, // 4: lower-left
  { xR: 0.60, yR: 0.78 }, // 5: lower-right
  { xR: 0.50, yR: 0.78 }, // 6: bottom-center
  // Outer (filled later)
  { xR: 0.30, yR: 0.35 }, // 7: upper-left
  { xR: 0.70, yR: 0.35 }, // 8: upper-right
  { xR: 0.30, yR: 0.68 }, // 9: lower-left further out
  { xR: 0.70, yR: 0.68 }, // 10: lower-right further out
]

/**
 * Portrait slots: kept inside the narrow central aisle between the left and
 * right shelf walls (xR ≈ 0.45–0.55) so silhouettes never overlap shelves.
 * yR span avoids the pedestal band at top and the private door at bottom.
 */
const PORTRAIT_SILHOUETTE_SLOTS: Array<{ xR: number; yR: number }> = [
  { xR: 0.50, yR: 0.42 },
  { xR: 0.50, yR: 0.50 },
  { xR: 0.46, yR: 0.58 },
  { xR: 0.54, yR: 0.58 },
  { xR: 0.50, yR: 0.66 },
  { xR: 0.46, yR: 0.74 },
  { xR: 0.54, yR: 0.74 },
  { xR: 0.50, yR: 0.80 },
  { xR: 0.46, yR: 0.86 },
  { xR: 0.54, yR: 0.86 },
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
  // Tighter jitter in portrait: the central aisle is only ~96px wide, so we
  // can't afford ±11px horizontal scatter.
  const jitterRangeX = portrait ? 8 : 22
  const jitterRangeY = portrait ? 12 : 18

  for (let i = 0; i < count; i++) {
    const slot = slots[i]
    // Deterministic per-library jitter so silhouettes feel placed, not perfectly aligned.
    const jitterX = ((seed * 17 + i * 31) % jitterRangeX) - jitterRangeX / 2
    const jitterY = ((seed * 13 + i * 19) % jitterRangeY) - jitterRangeY / 2
    const x = W * slot.xR + jitterX
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
  const nr = Math.round(r * f)
  const ng = Math.round(g * f)
  const nb = Math.round(b * f)
  return '#' + [nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function parseHex(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return [0, 0, 0]
  return m.slice(0, 3).map((h) => parseInt(h, 16)) as [number, number, number]
}
