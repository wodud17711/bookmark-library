import { HexColorPicker } from 'react-colorful'
import { colorName, readPalette } from '../../utils/bookCoverPalette'

interface Props {
  value: string
  onChange: (hex: string) => void
  /** When provided, replaces the localStorage-backed palette (used for
   *  controlled previews). Defaults to the live recent-colors palette. */
  palette?: string[]
  /** When set (along with onAiPickChange), an "🤖 AI 추천" swatch appears as
   *  the first slot. true means AI mode is active and color swatches are
   *  visually deselected. Selecting any color swatch flips AI mode off via
   *  onAiPickChange — caller doesn't need to wire that on its onChange. */
  aiPickActive?: boolean
  onAiPickChange?: (active: boolean) => void
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function BookCoverPicker({
  value,
  onChange,
  palette,
  aiPickActive,
  onAiPickChange,
}: Props) {
  const normalized = HEX_RE.test(value) ? value.toUpperCase() : '#3D2817'
  const slots = palette ?? readPalette()
  const showAiSwatch = onAiPickChange !== undefined
  const aiOn = !!aiPickActive

  // Wraps onChange to deactivate AI whenever the user picks a real color —
  // AddBookModal doesn't need to thread that itself.
  const pickColor = (hex: string) => {
    onChange(hex)
    if (showAiSwatch && aiOn) onAiPickChange?.(false)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-2 gap-3">
        <label className="text-sm font-medium text-(--color-ink-strong) shrink-0">
          책 등 색상
          {aiOn && (
            <span className="ml-2 text-xs font-normal text-(--color-walnut-500)">
              · AI가 골라드려요
            </span>
          )}
        </label>
        <BookPreview color={normalized} aiActive={aiOn} />
      </div>
      <div className="grid grid-cols-8 gap-2 mb-3">
        {showAiSwatch && (
          <button
            type="button"
            onClick={() => onAiPickChange?.(true)}
            title="AI가 페이지에 어울리는 색을 골라드려요"
            aria-label="AI 자동 추천"
            aria-pressed={aiOn}
            className={[
              'aspect-square rounded-(--radius-xs) border transition-all',
              'flex items-center justify-center',
              'text-[11px] font-bold text-white tracking-tight',
              'drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]',
              aiOn
                ? 'border-(--color-walnut-500) ring-2 ring-(--color-walnut-300)/50 scale-105'
                : 'border-(--color-line) hover:border-(--color-walnut-300)',
            ].join(' ')}
            style={{
              background:
                'linear-gradient(135deg, #D9D0FF 0%, #9C8AF5 45%, #5B4FCC 100%)',
            }}
          >
            AI
          </button>
        )}
        {slots.map((hex, i) => {
          const selected = !aiOn && normalized === hex.toUpperCase()
          return (
            <button
              key={`${hex}-${i}`}
              type="button"
              onClick={() => pickColor(hex)}
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
            {aiOn ? 'AI 추천 사용 중' : colorName(normalized)}
          </span>
        </summary>
        <div className="mt-3 flex flex-col items-center gap-2">
          <HexColorPicker color={normalized} onChange={(c) => pickColor(c.toUpperCase())} />
          <div className="text-xs text-(--color-ink-faint) tabular-nums">{normalized}</div>
        </div>
      </details>
    </div>
  )
}

/** Mini "books on a shelf" illustration; the middle book carries the picked
 *  color so the user previews how it will land on their actual floor plan.
 *  When aiActive is true the middle book renders as the same violet gradient
 *  as the AI swatch so the user sees a consistent visual signal that the real
 *  color will only appear after submit. */
function BookPreview({ color, aiActive = false }: { color: string; aiActive?: boolean }) {
  const middleStyle = aiActive
    ? {
        background:
          'linear-gradient(135deg, #D9D0FF 0%, #9C8AF5 45%, #5B4FCC 100%)',
      }
    : { background: color }
  return (
    <div className="flex flex-col items-center select-none" aria-hidden="true">
      <div className="flex items-end gap-[1.5px] h-9">
        <span className="w-1.5 h-6 rounded-t-[1px]" style={{ background: '#3D2817' }} />
        <span className="w-2 h-7 rounded-t-[1px]" style={{ background: '#5A4030' }} />
        <span
          className="relative w-2.5 h-9 rounded-t-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
          style={middleStyle}
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
