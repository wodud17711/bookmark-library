import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMe, type Me } from '../api/auth'
import type { Book, Bookshelf } from '../api/library'
import { fetchStorageCount } from '../api/storage'
import { useLibrary } from '../hooks/useLibrary'
import { Button, Card, IconButton } from '../components/ui'
import { AddBookshelfModal } from '../components/library/AddBookshelfModal'
import { AddBookModal } from '../components/library/AddBookModal'
import { EditBookshelfModal } from '../components/library/EditBookshelfModal'
import { EditBookModal } from '../components/library/EditBookModal'
import { ImportBookmarksModal } from '../components/library/ImportBookmarksModal'
import { StorageDrawer } from '../components/library/StorageDrawer'

export default function LibraryPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const { library, loading, error, refetch } = useLibrary()

  const [addingShelf, setAddingShelf] = useState(false)
  const [addingBookFor, setAddingBookFor] = useState<Bookshelf | null>(null)
  const [editingShelf, setEditingShelf] = useState<Bookshelf | null>(null)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [importing, setImporting] = useState(false)
  const [storageOpen, setStorageOpen] = useState(false)
  const [storageCount, setStorageCount] = useState(0)

  useEffect(() => {
    fetchMe().then(setMe).catch((e) => setMeError(e.message))
  }, [])

  const refreshStorage = useCallback(() => {
    fetchStorageCount().then(setStorageCount).catch(() => {})
  }, [])

  useEffect(() => {
    refreshStorage()
  }, [refreshStorage])

  const refetchAll = useCallback(async () => {
    await refetch()
    refreshStorage()
  }, [refetch, refreshStorage])

  const totalBooks = useMemo(
    () => library?.bookshelves.reduce((sum, s) => sum + s.books.length, 0) ?? 0,
    [library],
  )

  if (loading) return <CenteredMessage>로딩 중…</CenteredMessage>

  if (meError || error || !me || !library) {
    return (
      <CenteredMessage>
        <p className="text-(--color-ink-muted) mb-5">로그인이 필요합니다.</p>
        <Button onClick={() => (window.location.href = '/login')}>로그인 페이지로</Button>
      </CenteredMessage>
    )
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header
        me={me}
        libraryTitle={library.title}
        storageCount={storageCount}
        onImport={() => setImporting(true)}
        onOpenStorage={() => setStorageOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
        <PixiPlaceholder />

        <Section title="📚 책장" subtitle={`${library.bookshelves.filter(s => s.zone === 'PUBLIC').length}개 · 공유 시 보임`}>
          <ShelfList
            shelves={library.bookshelves.filter((s) => s.zone === 'PUBLIC')}
            onAddBook={setAddingBookFor}
            onEditShelf={setEditingShelf}
            onEditBook={setEditingBook}
          />
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setAddingShelf(true)}>
              + 새 책장 추가
            </Button>
          </div>
        </Section>

        <Section
          title="🔒 프라이빗 룸"
          subtitle={`${library.bookshelves.filter(s => s.zone === 'PRIVATE').length}개 · 공유해도 보이지 않음`}
        >
          <ShelfList
            shelves={library.bookshelves.filter((s) => s.zone === 'PRIVATE')}
            onAddBook={setAddingBookFor}
            onEditShelf={setEditingShelf}
            onEditBook={setEditingBook}
          />
        </Section>
      </main>

      <footer className="mt-12 py-8 border-t border-(--color-line-soft) text-center">
        <p className="text-xs text-(--color-ink-faint)">
          ⌂ {library.bookshelves.length}개 책장 · {totalBooks}권 보관 중
        </p>
      </footer>

      <AddBookshelfModal
        open={addingShelf}
        onClose={() => setAddingShelf(false)}
        onCreated={refetch}
      />
      <AddBookModal
        open={!!addingBookFor}
        bookshelfId={addingBookFor?.id ?? null}
        bookshelfTitle={addingBookFor?.title ?? ''}
        onClose={() => setAddingBookFor(null)}
        onCreated={refetch}
      />
      <EditBookshelfModal
        open={!!editingShelf}
        bookshelf={editingShelf}
        onClose={() => setEditingShelf(null)}
        onChanged={refetch}
      />
      <EditBookModal
        open={!!editingBook}
        book={editingBook}
        currentShelfId={
          editingBook
            ? library.bookshelves.find((s) => s.books.some((b) => b.id === editingBook.id))?.id ?? null
            : null
        }
        shelves={library.bookshelves}
        onClose={() => setEditingBook(null)}
        onChanged={refetchAll}
      />
      <ImportBookmarksModal
        open={importing}
        onClose={() => setImporting(false)}
        onImported={refetchAll}
      />
      <StorageDrawer
        open={storageOpen}
        shelves={library.bookshelves}
        onClose={() => setStorageOpen(false)}
        onChanged={refetchAll}
      />
    </div>
  )
}

function Header({
  me,
  libraryTitle,
  storageCount,
  onImport,
  onOpenStorage,
}: {
  me: Me
  libraryTitle: string
  storageCount: number
  onImport: () => void
  onOpenStorage: () => void
}) {
  return (
    <header className="border-b border-(--color-line) bg-(--color-surface-raised)/60 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-semibold text-(--color-ink-strong) tracking-tight truncate">
          {libraryTitle}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenStorage}
            className="text-sm px-3 py-1.5 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors text-(--color-ink) flex items-center gap-1.5"
            title="창고 열기"
          >
            <span>📦</span>
            <span className="font-medium">{storageCount}</span>
          </button>
          <Button variant="secondary" size="sm" onClick={onImport}>
            가져오기
          </Button>
          <span className="hidden md:inline-block w-px h-5 bg-(--color-line) mx-1" />
          <span className="hidden md:inline text-sm text-(--color-ink-muted)">@{me.username}</span>
          <a
            href="/logout"
            className="text-sm text-(--color-ink-muted) hover:text-(--color-walnut-500) transition-colors px-2"
          >
            로그아웃
          </a>
        </div>
      </div>
    </header>
  )
}

function PixiPlaceholder() {
  return (
    <Card variant="raised" padding="lg" className="border-dashed">
      <div className="flex items-start gap-4">
        <div className="text-2xl">📚</div>
        <div className="flex-1">
          <h2 className="font-medium text-(--color-ink-strong) mb-1">
            도서관 평면도가 여기에 그려질 자리예요.
          </h2>
          <p className="text-sm text-(--color-ink-muted) leading-relaxed">
            지금은 책/책장을 직접 추가/편집/삭제할 수 있는 리스트 모드입니다.
            데이터를 좀 채워두면 다음 단계(Pixi.js 평면도 시각화)에서 책장이 진짜 풍경으로 그려집니다.
          </p>
        </div>
      </div>
    </Card>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-(--color-ink-strong) tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-(--color-ink-muted) mt-1">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function ShelfList({
  shelves,
  onAddBook,
  onEditShelf,
  onEditBook,
}: {
  shelves: Bookshelf[]
  onAddBook: (shelf: Bookshelf) => void
  onEditShelf: (shelf: Bookshelf) => void
  onEditBook: (book: Book) => void
}) {
  if (shelves.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-sm text-(--color-ink-muted)">아직 책장이 없습니다.</p>
      </Card>
    )
  }
  return (
    <div className="space-y-4">
      {shelves.map((shelf) => (
        <ShelfCard
          key={shelf.id}
          shelf={shelf}
          onAddBook={() => onAddBook(shelf)}
          onEditShelf={() => onEditShelf(shelf)}
          onEditBook={onEditBook}
        />
      ))}
    </div>
  )
}

function ShelfCard({
  shelf,
  onAddBook,
  onEditShelf,
  onEditBook,
}: {
  shelf: Bookshelf
  onAddBook: () => void
  onEditShelf: () => void
  onEditBook: (book: Book) => void
}) {
  const usage = shelf.books.length / shelf.maxBooks
  const usageHue =
    usage < 0.7
      ? 'text-(--color-ink-muted)'
      : usage < 0.95
        ? 'text-(--color-walnut-500)'
        : 'text-(--color-danger)'
  const isFull = shelf.books.length >= shelf.maxBooks

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg font-semibold text-(--color-ink-strong)">
            {shelf.title}
          </h3>
          <span className={`text-xs ${usageHue}`}>
            {shelf.books.length} / {shelf.maxBooks}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onAddBook} disabled={isFull}>
            {isFull ? '책장 가득' : '+ 책 추가'}
          </Button>
          <IconButton label="책장 편집" onClick={onEditShelf} size="sm">
            <EditIcon />
          </IconButton>
        </div>
      </div>

      {shelf.books.length === 0 ? (
        <EmptyShelf onAddBook={onAddBook} />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {shelf.books.map((book) => (
            <BookRow key={book.id} book={book} onEdit={() => onEditBook(book)} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function EmptyShelf({ onAddBook }: { onAddBook: () => void }) {
  return (
    <button
      onClick={onAddBook}
      className="w-full py-8 text-center bg-(--color-surface-sunken) rounded-(--radius-sm)
                 border border-dashed border-(--color-line)
                 hover:border-(--color-walnut-300) hover:bg-(--color-walnut-50)
                 transition-colors"
    >
      <p className="text-sm text-(--color-ink-muted)">+ 첫 책 추가하기</p>
    </button>
  )
}

function BookRow({ book, onEdit }: { book: Book; onEdit: () => void }) {
  return (
    <li className="group flex items-center gap-3 px-3 py-2.5 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors">
      <span
        className="w-1.5 h-8 rounded-(--radius-xs) shrink-0"
        style={{ background: book.coverColor }}
        aria-hidden="true"
      />
      <a
        href={book.url}
        target="_blank"
        rel="noreferrer"
        className="flex-1 min-w-0 text-[14px] text-(--color-ink-strong) hover:text-(--color-walnut-500) transition-colors truncate"
        title={book.url}
      >
        {book.title}
      </a>
      {book.isFavorite && <span className="text-(--color-walnut-500) text-sm" title="베스트셀러">★</span>}
      <button
        onClick={onEdit}
        className="opacity-0 group-hover:opacity-100 transition-opacity
                   text-xs text-(--color-ink-muted) hover:text-(--color-walnut-500) px-2"
        aria-label="편집"
      >
        편집
      </button>
    </li>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="text-center">{children}</div>
    </div>
  )
}
