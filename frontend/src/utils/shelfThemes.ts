/**
 * Color tokens for in-canvas Pixi rendering. Two independent palettes:
 *   - SHELF_PALETTES: bookshelf wood / shadow / optional metal frame
 *   - FLOOR_PALETTES: floor primary / plank seam shadow
 *
 * Both mirror the rows seeded by the backend
 * (BookshelfThemeService.seedDefaultsIfMissing,
 *  FloorThemeService.seedDefaultsIfMissing). Keep in sync if you add
 * new themes server-side.
 */

export interface ShelfPalette {
  wood: string
  shadow: string
  /** Legacy field, no longer used in scene rendering (floor took over background). */
  wall?: string
  /** Optional metal frame accent (industrial). */
  frame?: string
}

export interface FloorPalette {
  primary: string
  shadow: string
}

export const SHELF_PALETTES: Record<string, ShelfPalette> = {
  'warm-walnut': {
    wood: '#5C3A2A',
    shadow: '#2E1D14',
    wall: '#1F1816',
  },
  'warm-pine': {
    wood: '#E5D2B0',
    shadow: '#C9B088',
    wall: '#FAF7F2',
  },
  'industrial-frame': {
    wood: '#C9A878',
    shadow: '#8B6F4A',
    wall: '#E8E5DF',
    frame: '#2C2A28',
  },
}

export const FLOOR_PALETTES: Record<string, FloorPalette> = {
  'cream-pine': {
    primary: '#E5D2B0',
    shadow: '#C9B088',
  },
  'golden-oak': {
    primary: '#B5824D',
    shadow: '#8B5A3C',
  },
  'dark-wenge': {
    primary: '#3D2817',
    shadow: '#1F140A',
  },
}

export const DEFAULT_SHELF_PALETTE: ShelfPalette = SHELF_PALETTES['warm-walnut']
export const DEFAULT_FLOOR_PALETTE: FloorPalette = FLOOR_PALETTES['cream-pine']

export function paletteFor(name: string | undefined | null): ShelfPalette {
  if (!name) return DEFAULT_SHELF_PALETTE
  return SHELF_PALETTES[name] ?? DEFAULT_SHELF_PALETTE
}

export function floorPaletteFor(name: string | undefined | null): FloorPalette {
  if (!name) return DEFAULT_FLOOR_PALETTE
  return FLOOR_PALETTES[name] ?? DEFAULT_FLOOR_PALETTE
}
