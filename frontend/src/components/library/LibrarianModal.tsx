import { useEffect, useRef, useState } from 'react'
import { Modal } from '../ui'
import {
  searchLibrary,
  type BookHit,
  type SearchResponse,
  type StoredHit,
} from '../../api/search'

interface Props {
  open: boolean
  onClose: () => void
  /** Called when user clicks a book in the current library — parent scrolls to its shelf. */
  onScrollToShelf: (bookshelfId: number) => void
  /**
   * Called when user clicks a book in a different library. Parent should
   * switch to that library and (after refetch lands) scroll to the shelf.
   */
  onJumpToOtherLibrary: (libraryId: number, bookshelfId: number) => void
  /** Open the storage drawer when user clicks a stored hit. */
  onOpenStorage: () => void
}

/**
 * "사서" — librarian. Search across every library + storage and report each
 * book's location. Click a result to navigate.
 */
export function LibrarianModal({ open, onClose, onScrollToShelf, onJumpToOtherLibrary, onOpenStorage }: Props) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Reset state when opening.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResult(null)
      setLoading(false)
      return
    }
    // Focus the input shortly after the modal mounts.
    const id = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(id)
  }, [open])

  // Debounced search.
  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (trimmed.length === 0) {
      setResult(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const handle = window.setTimeout(() => {
      searchLibrary(trimmed)
        .then(setResult)
        .catch(() => setResult({ query: trimmed, books: [], stored: [] }))
        .finally(() => setLoading(false))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [open, query])

  const handleBookClick = (hit: BookHit) => {
    if (hit.isCurrentLibrary) {
      onScrollToShelf(hit.bookshelfId)
    } else {
      onJumpToOtherLibrary(hit.libraryId, hit.bookshelfId)
    }
    onClose()
  }

  const handleStoredClick = () => {
    onOpenStorage()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="📖 사서에게 묻기" size="lg">
      <div className="space-y-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="찾고 싶은 책 제목, URL, 사이트 이름…"
            className="w-full pl-10 pr-9 py-3 text-base bg-(--color-surface-raised)
                       border border-(--color-line) rounded-(--radius-sm)
                       focus:outline-none focus:border-(--color-walnut-500) focus:ring-2 focus:ring-(--color-walnut-300)/40"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-ink-muted)">🔍</span>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-ink-muted) hover:text-(--color-ink) px-1"
            >
              ×
            </button>
          )}
        </div>

        {!query.trim() && (
          <p className="text-sm text-(--color-ink-muted) text-center py-8 leading-relaxed">
            안녕하세요. 어떤 책을 찾고 계신가요?<br />
            제목, 사이트 이름, URL 일부로 찾아드릴 수 있어요.
          </p>
        )}

        {query.trim() && loading && !result && (
          <p className="text-sm text-(--color-ink-muted) text-center py-8">찾는 중…</p>
        )}

        {result && (
          <SearchResults
            result={result}
            onBookClick={handleBookClick}
            onStoredClick={handleStoredClick}
          />
        )}
      </div>
    </Modal>
  )
}

function SearchResults({
  result,
  onBookClick,
  onStoredClick,
}: {
  result: SearchResponse
  onBookClick: (hit: BookHit) => void
  onStoredClick: (hit: StoredHit) => void
}) {
  const totalHits = result.books.length + result.stored.length
  if (totalHits === 0) {
    return (
      <p className="text-sm text-(--color-ink-muted) text-center py-8">
        "{result.query}" 와(과) 일치하는 책을 찾지 못했어요.
      </p>
    )
  }

  // Group book hits by library so users can scan locations easily.
  const booksByLibrary = new Map<number, { libraryTitle: string; isCurrent: boolean; hits: BookHit[] }>()
  for (const hit of result.books) {
    if (!booksByLibrary.has(hit.libraryId)) {
      booksByLibrary.set(hit.libraryId, {
        libraryTitle: hit.libraryTitle,
        isCurrent: hit.isCurrentLibrary,
        hits: [],
      })
    }
    booksByLibrary.get(hit.libraryId)!.hits.push(hit)
  }

  return (
    <div className="space-y-5 max-h-[55vh] overflow-auto pr-1">
      {[...booksByLibrary.entries()].map(([libId, group]) => (
        <section key={libId}>
          <SectionHeader
            label={`📚 ${group.libraryTitle}`}
            badge={group.isCurrent ? '현재' : '다른 도서관'}
            count={group.hits.length}
          />
          <ul className="space-y-1">
            {group.hits.map((hit) => (
              <BookRow key={hit.id} hit={hit} onClick={() => onBookClick(hit)} />
            ))}
          </ul>
        </section>
      ))}

      {result.stored.length > 0 && (
        <section>
          <SectionHeader label="📦 창고" badge="" count={result.stored.length} />
          <ul className="space-y-1">
            {result.stored.map((hit) => (
              <StoredRow key={hit.id} hit={hit} onClick={() => onStoredClick(hit)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function SectionHeader({ label, badge, count }: { label: string; badge: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mb-2 pb-1 border-b border-(--color-line-soft)">
      <span className="text-sm font-medium text-(--color-ink-strong)">
        {label}
        {badge && (
          <span className="ml-2 text-xs font-normal text-(--color-ink-muted)">· {badge}</span>
        )}
      </span>
      <span className="text-xs text-(--color-ink-muted)">{count}권</span>
    </div>
  )
}

function BookRow({ hit, onClick }: { hit: BookHit; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-(--radius-sm)
                   hover:bg-(--color-surface-sunken) transition-colors group"
      >
        <span
          className="w-1.5 h-9 rounded-(--radius-xs) shrink-0"
          style={{ background: hit.coverColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-(--color-ink-strong) truncate">{hit.title}</span>
            {hit.isFavorite && (
              <span className="text-(--color-walnut-500) text-xs shrink-0" title="베스트셀러">★</span>
            )}
          </div>
          <p className="text-xs text-(--color-ink-muted) mt-0.5 truncate">
            {hit.bookshelfTitle}
            {hit.bookshelfZone === 'PRIVATE' && <span className="ml-1">🔒</span>}
            <span className="text-(--color-ink-faint) ml-1.5">· {hit.url}</span>
          </p>
        </div>
        <span className="text-xs text-(--color-ink-faint) md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          {hit.isCurrentLibrary ? '책장으로 →' : '도서관 이동 →'}
        </span>
      </button>
    </li>
  )
}

function StoredRow({ hit, onClick }: { hit: StoredHit; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-(--radius-sm)
                   hover:bg-(--color-surface-sunken) transition-colors group"
      >
        <span className="text-base shrink-0" aria-hidden="true">📦</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-(--color-ink-strong) truncate">{hit.title}</p>
          <p className="text-xs text-(--color-ink-muted) mt-0.5 truncate">
            {hit.originalFolder ?? '(폴더 없음)'}
            <span className="text-(--color-ink-faint) ml-1.5">· {hit.url}</span>
          </p>
        </div>
        <span className="text-xs text-(--color-ink-faint) md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          창고 열기 →
        </span>
      </button>
    </li>
  )
}
