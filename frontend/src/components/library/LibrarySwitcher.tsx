import { useEffect, useRef, useState } from 'react'
import {
  fetchMyLibraries,
  MAX_LIBRARIES_PER_USER,
  switchCurrentLibrary,
  type LibrarySummary,
} from '../../api/library'

interface Props {
  /** Current library title for label display. */
  currentTitle: string
  /** Called after a switch or create completes — parent should refetch. */
  onSwitched: () => void
  onRequestCreate: () => void
}

/**
 * Header dropdown listing all of the user's libraries with a "+ new library"
 * action. Reloads the list whenever it opens so it stays fresh.
 */
export function LibrarySwitcher({ currentTitle, onSwitched, onRequestCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [libraries, setLibraries] = useState<LibrarySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Refresh list whenever opening.
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchMyLibraries()
      .then(setLibraries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const handleSwitch = async (id: number) => {
    setSwitching(id)
    try {
      await switchCurrentLibrary(id)
      setOpen(false)
      onSwitched()
    } catch {
      // No-op for v1; could show toast.
    } finally {
      setSwitching(null)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors"
        title="도서관 전환"
      >
        <span className="font-display text-base font-semibold text-(--color-ink-strong) tracking-tight truncate max-w-[260px]">
          {currentTitle}
        </span>
        <ChevronDown />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-80 z-20
                     bg-(--color-surface-raised) border border-(--color-line)
                     rounded-(--radius-md) shadow-(--shadow-lg)
                     py-1 max-h-[480px] overflow-auto"
          role="menu"
        >
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-(--color-ink-muted) font-medium">
            내 도서관
          </div>
          {loading ? (
            <p className="px-4 py-3 text-sm text-(--color-ink-muted)">불러오는 중…</p>
          ) : libraries.length === 0 ? (
            <p className="px-4 py-3 text-sm text-(--color-ink-muted)">없음</p>
          ) : (
            <ul>
              {libraries.map((lib) => (
                <li key={lib.id}>
                  <button
                    type="button"
                    onClick={() => !lib.isCurrent && handleSwitch(lib.id)}
                    disabled={lib.isCurrent || switching !== null}
                    className={[
                      'w-full text-left px-4 py-2.5 transition-colors',
                      lib.isCurrent
                        ? 'bg-(--color-walnut-50) cursor-default'
                        : 'hover:bg-(--color-surface-sunken)',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-(--color-ink-strong) truncate">
                        {lib.title}
                      </span>
                      {lib.isCurrent && (
                        <span className="text-xs text-(--color-walnut-500) font-medium shrink-0">
                          현재
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-(--color-ink-muted)">
                      <span>/{lib.slug}</span>
                      <span>·</span>
                      <span>책장 {lib.bookshelfCount} / 8</span>
                      {lib.isPublic && (
                        <>
                          <span>·</span>
                          <span className="text-(--color-success)">공개</span>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-(--color-line-soft) my-1" />
          {libraries.length >= MAX_LIBRARIES_PER_USER ? (
            <div className="px-4 py-2.5 text-xs text-(--color-ink-muted) leading-relaxed">
              도서관은 {MAX_LIBRARIES_PER_USER}개까지 만들 수 있어요
              <span className="block mt-0.5 text-(--color-ink-faint)">
                ({libraries.length} / {MAX_LIBRARIES_PER_USER})
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onRequestCreate()
              }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-(--color-walnut-500)
                         hover:bg-(--color-surface-sunken) transition-colors"
            >
              + 새 도서관 만들기 ({libraries.length} / {MAX_LIBRARIES_PER_USER})
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 5L7 9L11 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
