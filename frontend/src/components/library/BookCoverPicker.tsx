import { HexColorPicker } from 'react-colorful'
import { colorName, readPalette } from '../../utils/bookCoverPalette'

interface Props {
  value: string
  onChange: (hex: string) => void
  /** When provided, replaces the localStorage-backed palette (used for
   *  controlled previews). Defaults to the live recent-colors palette. */
  palette?: string[]
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function BookCoverPicker({ value, onChange, palette }: Props) {
  const normalized = HEX_RE.test(value) ? value.toUpperCase() : '#3D2817'
  const slots = palette ?? readPalette()

  return (
    <div>
      <div className="flex items-end justify-between mb-2 gap-3">
        <label className="text-sm font-medium text-(--color-ink-strong) shrink-0">
          책 등 색상
        </label>
        <BookPreview color={normalized} />
      </div>
      <div className="grid grid-cols-8 gap-2 mb-3">
        {slots.map((hex, i) => {
          const selected = normalized === hex.toUpperCase()
          return (
            <button
              key={`${hex}-${i}`}
              type="button"
              onClick={() => onChange(hex)}
              title={colorName(hex)}
              aria-label={colorName(hex)}
              aria-pressed={selected}
              className={[
                'aspect-square rounded-(--radius-xs) border transition-all',
                selected
                  ? 'border-(--color-walnut-500) ring-2 ring-(--color-walnut-300)/50 scale-105'
                  : 'border-(--color-line) hover:border-(--color-walnut-300)',
              ].join(' ')}
              style={{ background: hex }}
            />
          )
        })}
      </div>
      <details className="group">
        <summary className="cursor-pointer text-sm text-(--color-ink-muted) hover:text-(--color-walnut-500) transition-colors flex items-center gap-1.5 select-none list-none">
          <span className="inline-block transition-transform group-open:rotate-90">▶</span>
          <span>직접 선택</span>
          <span className="text-xs text-(--color-ink-faint) tabular-nums ml-auto">
            {colorName(normalized)}
          </span>
        </summary>
        <div className="mt-3 flex flex-col items-center gap-2">
          <HexColorPicker color={normalized} onChange={(c) => onChange(c.toUpperCase())} />
          <div className="text-xs text-(--color-ink-faint) tabular-nums">{normalized}</div>
        </div>
      </details>
    </div>
  )
}

/** Mini "books on a shelf" illustration; the middle book carries the picked
 *  color so the user previews how it will land on their actual floor plan. */
function BookPreview({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center select-none" aria-hidden="true">
      <div className="flex items-end gap-[1.5px] h-9">
        <span className="w-1.5 h-6 rounded-t-[1px]" style={{ background: '#3D2817' }} />
        <span className="w-2 h-7 rounded-t-[1px]" style={{ background: '#5A4030' }} />
        <span
          className="relative w-2.5 h-9 rounded-t-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
          style={{ background: color }}
        >
          <span className="absolute inset-y-1 left-px w-[1.5px] bg-white/20 rounded-full" />
        </span>
        <span className="w-2 h-8 rounded-t-[1px]" style={{ background: '#7A5C40' }} />
        <span className="w-1.5 h-7 rounded-t-[1px]" style={{ background: '#3D2817' }} />
      </div>
      <div className="w-14 h-1 rounded-sm shadow-sm" style={{ background: '#6E442A' }} />
    </div>
  )
}
