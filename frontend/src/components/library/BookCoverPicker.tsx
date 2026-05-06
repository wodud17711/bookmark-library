interface Props {
  value: string
  onChange: (hex: string) => void
}

const PRESETS: { hex: string; name: string }[] = [
  { hex: '#3D2817', name: '다크 월넛' },
  { hex: '#8B5A3C', name: '월넛' },
  { hex: '#2C4A3E', name: '포레스트' },
  { hex: '#6B2C2C', name: '버건디' },
  { hex: '#2C4A6B', name: '오션' },
  { hex: '#6A7A5C', name: '세이지' },
  { hex: '#E5D9B6', name: '크림' },
  { hex: '#2A2520', name: '차콜' },
]

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function BookCoverPicker({ value, onChange }: Props) {
  const normalized = HEX_RE.test(value) ? value.toUpperCase() : '#3D2817'
  const matchedPreset = PRESETS.find((p) => p.hex.toUpperCase() === normalized)

  return (
    <div>
      <label className="text-sm font-medium text-(--color-ink-strong) block mb-1.5">
        책 등 색상
      </label>
      <div className="grid grid-cols-8 gap-2 mb-3">
        {PRESETS.map((p) => {
          const selected = normalized === p.hex.toUpperCase()
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              title={p.name}
              aria-label={p.name}
              aria-pressed={selected}
              className={[
                'aspect-square rounded-(--radius-xs) border transition-all',
                selected
                  ? 'border-(--color-walnut-500) ring-2 ring-(--color-walnut-300)/50 scale-105'
                  : 'border-(--color-line) hover:border-(--color-walnut-300)',
              ].join(' ')}
              style={{ background: p.hex }}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center gap-2 cursor-pointer text-sm text-(--color-ink-muted) hover:text-(--color-walnut-500) transition-colors">
          <input
            type="color"
            value={normalized}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="w-7 h-7 rounded-(--radius-xs) border border-(--color-line) cursor-pointer
                       [&::-webkit-color-swatch]:rounded-[3px]
                       [&::-webkit-color-swatch-wrapper]:p-0.5
                       [&::-moz-color-swatch]:rounded-[3px]"
            aria-label="직접 색상 선택"
          />
          <span>직접 선택</span>
        </label>
        <span className="text-xs text-(--color-ink-faint) tabular-nums ml-auto">
          {matchedPreset ? matchedPreset.name : normalized}
        </span>
      </div>
    </div>
  )
}
