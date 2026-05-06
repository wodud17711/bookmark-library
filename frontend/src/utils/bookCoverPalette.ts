/**
 * Per-browser palette of 8 book-spine colors. The user sees them as preset
 * chips in the BookCoverPicker. On every successful book save, the saved
 * color is recorded — if it's already in the palette it moves to the right
 * end (LRU); otherwise it's appended and the oldest leftmost color falls
 * out. This way the user's recently-used custom colors persist as quick
 * picks across sessions.
 */

const STORAGE_KEY = 'bookmark.recentBookColors'
const HEX_RE = /^#[0-9A-Fa-f]{6}$/
const SLOTS = 8

/** Built-in starting palette — also used as fallback when localStorage
 *  is empty or corrupted. Names are kept for hover tooltips. */
export const PRESET_NAMES: Record<string, string> = {
  '#3D2817': '다크 월넛',
  '#8B5A3C': '월넛',
  '#2C4A3E': '포레스트',
  '#6B2C2C': '버건디',
  '#2C4A6B': '오션',
  '#6A7A5C': '세이지',
  '#E5D9B6': '크림',
  '#2A2520': '차콜',
}

const DEFAULT_PALETTE: string[] = Object.keys(PRESET_NAMES)

/** Most recently saved color — used by AddBookModal as the default. */
export function lastUsedColor(): string {
  const palette = readPalette()
  return palette[palette.length - 1] ?? DEFAULT_PALETTE[0]
}

export function readPalette(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const arr = JSON.parse(stored)
      if (
        Array.isArray(arr) &&
        arr.length === SLOTS &&
        arr.every((s) => typeof s === 'string' && HEX_RE.test(s))
      ) {
        return arr.map((s: string) => s.toUpperCase())
      }
    }
  } catch {
    // localStorage may throw in private mode; fall back to defaults.
  }
  return [...DEFAULT_PALETTE]
}

/** Append the given color to the right end of the palette. If it was already
 *  present, it is moved to the end without displacing others; otherwise the
 *  leftmost color is dropped. */
export function recordColor(hex: string): void {
  if (!HEX_RE.test(hex)) return
  const upper = hex.toUpperCase()
  const current = readPalette()
  const without = current.filter((c) => c !== upper)
  const next = [...without, upper].slice(-SLOTS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota / private mode; non-fatal.
  }
}

export function colorName(hex: string): string {
  return PRESET_NAMES[hex.toUpperCase()] ?? hex.toUpperCase()
}
