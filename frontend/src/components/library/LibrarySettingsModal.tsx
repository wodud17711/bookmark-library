import { useEffect, useState } from 'react'
import { Button, Modal, TextInput, Textarea } from '../ui'
import {
  updateLibrary,
  type EntranceMood,
  type Library,
} from '../../api/library'
import { fetchThemes, type Theme } from '../../api/themes'
import { fetchFloorThemes, type FloorTheme } from '../../api/floorThemes'
import { extractApiErrorMessage } from '../../api/client'

interface Props {
  open: boolean
  library: Library
  onClose: () => void
  onSaved: () => void
}

const MOOD_OPTIONS: Array<{ value: EntranceMood; label: string; hint: string }> = [
  { value: 'DAY', label: '낮', hint: '햇빛 드는 환한 입구' },
  { value: 'EVENING', label: '저녁', hint: '노을빛이 비치는 입구' },
  { value: 'NIGHT', label: '밤', hint: '달빛 아래 차분한 입구' },
]

export function LibrarySettingsModal({ open, library, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(library.title)
  const [welcomeMessage, setWelcomeMessage] = useState(library.welcomeMessage ?? '')
  const [entranceMood, setEntranceMood] = useState<EntranceMood>(library.entranceMood)
  const [paletteName, setPaletteName] = useState(library.paletteName)
  const [floorPaletteName, setFloorPaletteName] = useState(library.floorPaletteName)
  const [isPublic, setIsPublic] = useState(library.isPublic)
  const [themes, setThemes] = useState<Theme[]>([])
  const [floorThemes, setFloorThemes] = useState<FloorTheme[]>([])
  const [submitting, setSubmitting] = useState(false)
  // Split errors so a field-specific validation message stays inline on its
  // input, while server errors (which can come from any field or the whole
  // request) surface in a banner at the bottom of the form near Save.
  const [titleError, setTitleError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Reset to current library state whenever modal opens.
  useEffect(() => {
    if (!open) return
    setTitle(library.title)
    setWelcomeMessage(library.welcomeMessage ?? '')
    setEntranceMood(library.entranceMood)
    setPaletteName(library.paletteName)
    setFloorPaletteName(library.floorPaletteName)
    setIsPublic(library.isPublic)
    setTitleError(null)
    setFormError(null)
  }, [open, library])

  // Fetch themes once when modal first opens.
  useEffect(() => {
    if (!open) return
    if (themes.length === 0) {
      fetchThemes().then(setThemes).catch(() => {})
    }
    if (floorThemes.length === 0) {
      fetchFloorThemes().then(setFloorThemes).catch(() => {})
    }
  }, [open, themes.length, floorThemes.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTitleError(null)
    setFormError(null)
    if (!title.trim()) {
      setTitleError('도서관 이름은 비울 수 없습니다.')
      return
    }
    setSubmitting(true)
    try {
      await updateLibrary({
        title: title.trim(),
        welcomeMessage,
        entranceMood,
        paletteName,
        floorPaletteName,
        isPublic,
      })
      onSaved()
      onClose()
    } catch (err) {
      setFormError(extractApiErrorMessage(err, '저장 실패'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="도서관 설정"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button type="submit" form="library-settings-form" disabled={submitting}>
            {submitting ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      <form id="library-settings-form" onSubmit={handleSubmit} className="space-y-7">
        <Section title="기본 정보">
          <TextInput
            label="도서관 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={128}
            error={titleError ?? undefined}
          />
          <Textarea
            label="입구 환영 메시지"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="방문하신 분들에게 한마디 — 빈 칸으로 두어도 됩니다"
            maxLength={1000}
            rows={4}
            showCount
          />
        </Section>

        <Section title="입구 분위기" hint="평면도의 입구 쪽 조명에 반영됩니다.">
          <div className="grid grid-cols-3 gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <ChoiceCard
                key={opt.value}
                selected={entranceMood === opt.value}
                onClick={() => setEntranceMood(opt.value)}
                title={opt.label}
                description={opt.hint}
              />
            ))}
          </div>
        </Section>

        <Section
          title="책장 테마"
          hint="모든 책장에 일괄 적용됩니다. 추후 책장별 다른 테마 지원 예정."
        >
          {themes.length === 0 ? (
            <p className="text-sm text-(--color-ink-muted)">테마 불러오는 중…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {themes.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  selected={paletteName === t.id}
                  onClick={() => setPaletteName(t.id)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="마룻바닥 테마"
          hint="도서관 전체 바닥에 적용됩니다. 책장 색과 독립적으로 선택 가능."
        >
          {floorThemes.length === 0 ? (
            <p className="text-sm text-(--color-ink-muted)">마루 불러오는 중…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {floorThemes.map((t) => (
                <FloorThemeCard
                  key={t.id}
                  theme={t}
                  selected={floorPaletteName === t.id}
                  onClick={() => setFloorPaletteName(t.id)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="공개 설정">
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className="flex items-start gap-3 w-full text-left p-3 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors"
          >
            <span
              className={[
                'mt-0.5 w-10 h-6 rounded-full p-0.5 transition-colors shrink-0',
                isPublic ? 'bg-(--color-walnut-500)' : 'bg-(--color-line)',
              ].join(' ')}
              role="switch"
              aria-checked={isPublic}
              aria-label="공개 여부"
            >
              <span
                className={[
                  'block w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                  isPublic ? 'translate-x-4' : 'translate-x-0',
                ].join(' ')}
              />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-(--color-ink-strong)">
                {isPublic ? '공개 도서관' : '비공개 도서관'}
              </p>
              <p className="text-xs text-(--color-ink-muted) mt-0.5 leading-relaxed">
                {isPublic
                  ? `bookmark.app/u/${library.ownerUsername} 링크로 누구나 도서관을 볼 수 있습니다. 프라이빗 룸의 책장은 보이지 않습니다.`
                  : '본인 외에는 도서관을 볼 수 없습니다.'}
              </p>
            </div>
          </button>
        </Section>

        {formError && (
          <div
            role="alert"
            className="px-4 py-3 rounded-(--radius-sm) bg-(--color-danger)/10 border border-(--color-danger)/30 text-sm text-(--color-danger)"
          >
            {formError}
          </div>
        )}
      </form>
    </Modal>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2.5">
        <h3 className="text-sm font-semibold text-(--color-ink-strong)">{title}</h3>
        {hint && <p className="text-xs text-(--color-ink-muted) mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function ChoiceCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left p-3 rounded-(--radius-sm) border transition-all',
        selected
          ? 'border-(--color-walnut-500) bg-(--color-walnut-50)'
          : 'border-(--color-line) hover:border-(--color-walnut-300)',
      ].join(' ')}
    >
      <p className="font-medium text-(--color-ink-strong) text-sm">{title}</p>
      <p className="text-xs text-(--color-ink-muted) mt-0.5">{description}</p>
    </button>
  )
}

function ThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: Theme
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left rounded-(--radius-sm) border-2 overflow-hidden transition-all',
        selected
          ? 'border-(--color-walnut-500) shadow-(--shadow-md)'
          : 'border-(--color-line) hover:border-(--color-walnut-300)',
      ].join(' ')}
    >
      <ThemeSwatch theme={theme} />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="font-medium text-sm text-(--color-ink-strong) truncate">
            {theme.displayName}
          </p>
          <TierBadge tier={theme.tier} priceKrw={theme.priceKrw} />
        </div>
        {theme.description && (
          <p className="text-xs text-(--color-ink-muted) leading-snug line-clamp-2">
            {theme.description}
          </p>
        )}
      </div>
    </button>
  )
}

/** Tiny preview: wall background + a few "books" in wood color. */
function ThemeSwatch({ theme }: { theme: Theme }) {
  return (
    <div
      className="h-20 w-full flex items-end justify-center gap-1 px-3 pb-2"
      style={{ backgroundColor: theme.wallColor }}
    >
      {/* Optional industrial frame */}
      {theme.frameColor && (
        <div className="absolute" />
      )}
      {/* Books on a shelf */}
      <div
        className="flex items-end gap-1 p-1 rounded-sm"
        style={{
          backgroundColor: theme.frameColor ?? 'transparent',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5"
            style={{
              height: `${30 + ((i * 7) % 16)}px`,
              backgroundColor: i % 2 === 0 ? theme.woodColor : theme.shadowColor,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function FloorThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: FloorTheme
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left rounded-(--radius-sm) border-2 overflow-hidden transition-all',
        selected
          ? 'border-(--color-walnut-500) shadow-(--shadow-md)'
          : 'border-(--color-line) hover:border-(--color-walnut-300)',
      ].join(' ')}
    >
      <FloorSwatch theme={theme} />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="font-medium text-sm text-(--color-ink-strong) truncate">
            {theme.displayName}
          </p>
          <TierBadge tier={theme.tier} priceKrw={theme.priceKrw} />
        </div>
        {theme.description && (
          <p className="text-xs text-(--color-ink-muted) leading-snug line-clamp-2">
            {theme.description}
          </p>
        )}
      </div>
    </button>
  )
}

/** Tiny preview: floor primary with horizontal plank seams. */
function FloorSwatch({ theme }: { theme: FloorTheme }) {
  return (
    <div
      className="h-20 w-full relative"
      style={{ backgroundColor: theme.primaryColor }}
    >
      {/* Horizontal plank seams */}
      {[16, 36, 56].map((y) => (
        <div
          key={y}
          className="absolute left-0 right-0 h-px"
          style={{ top: y, backgroundColor: theme.shadowColor, opacity: 0.55 }}
        />
      ))}
      {/* A few vertical seams for texture */}
      {[24, 96, 168, 240].map((x, i) => (
        <div
          key={i}
          className="absolute w-px"
          style={{
            left: x,
            top: i % 2 === 0 ? 2 : 18,
            height: 16,
            backgroundColor: theme.shadowColor,
            opacity: 0.45,
          }}
        />
      ))}
    </div>
  )
}

function TierBadge({ tier, priceKrw }: { tier: 'FREE' | 'PAID'; priceKrw?: number }) {
  if (tier === 'FREE') {
    return (
      <span className="text-[10px] uppercase tracking-wide font-semibold text-(--color-success) shrink-0">
        FREE
      </span>
    )
  }
  return (
    <span className="text-[10px] uppercase tracking-wide font-semibold text-(--color-walnut-500) shrink-0">
      {priceKrw ? `₩${priceKrw.toLocaleString()}` : 'PAID'}
    </span>
  )
}
