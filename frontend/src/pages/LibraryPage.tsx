import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMe, type Me } from '../api/auth'
import { MAX_BOOKSHELVES_PER_LIBRARY, type Book, type Bookshelf } from '../api/library'
import { fetchStorageCount } from '../api/storage'
import { useLibrary } from '../hooks/useLibrary'
import { Button, Card, IconButton } from '../components/ui'
import { AddBookshelfModal } from '../components/library/AddBookshelfModal'
import { AddBookModal } from '../components/library/AddBookModal'
import { EditBookshelfModal } from '../components/library/EditBookshelfModal'
import { EditBookModal } from '../components/library/EditBookModal'
import { ImportBookmarksModal } from '../components/library/ImportBookmarksModal'
import { StorageDrawer } from '../components/library/StorageDrawer'
import { LibrarySettingsModal } from '../components/library/LibrarySettingsModal'
import { PixiLibraryScene } from '../components/library/PixiLibraryScene'
import { LibrarySwitcher } from '../components/library/LibrarySwitcher'
import { CreateLibraryModal } from '../components/library/CreateLibraryModal'
import { LibrarianModal } from '../components/library/LibrarianModal'
import { switchCurrentLibrary } from '../api/library'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [creatingLibrary, setCreatingLibrary] = useState(false)
  const [librarianOpen, setLibrarianOpen] = useState(false)
  /** Shelf to scroll to once a library switch finishes its refetch. */
  const [pendingScrollShelfId, setPendingScrollShelfId] = useState<number | null>(null)

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

  // Refs to each shelf card so the Pixi scene can scroll-into-view on click.
  const shelfCardRefs = useRef<Map<number, HTMLElement>>(new Map())
  const registerShelfCard = useCallback((id: number, el: HTMLElement | null) => {
    if (el) shelfCardRefs.current.set(id, el)
    else shelfCardRefs.current.delete(id)
  }, [])
  const handleShelfClickInScene = useCallback((id: number) => {
    const el = shelfCardRefs.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-(--color-walnut-300)')
      window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-(--color-walnut-300)')
      }, 1500)
    }
  }, [])

  /**
   * After library data updates (refetch following a switch), if there's a
   * pending scroll target — scroll to it. This lets the librarian modal jump
   * to a book in another library.
   */
  useEffect(() => {
    if (pendingScrollShelfId === null) return
    if (!library) return
    const exists = library.bookshelves.some((s) => s.id === pendingScrollShelfId)
    if (!exists) {
      setPendingScrollShelfId(null)
      return
    }
    // Wait one frame so the new ShelfCards have mounted and registered refs.
    const id = window.requestAnimationFrame(() => {
      handleShelfClickInScene(pendingScrollShelfId)
      setPendingScrollShelfId(null)
    })
    return () => window.cancelAnimationFrame(id)
  }, [library, pendingScrollShelfId, handleShelfClickInScene])

  const handleLibrarianJump = useCallback(
    async (libraryId: number, bookshelfId: number) => {
      try {
        await switchCurrentLibrary(libraryId)
        setPendingScrollShelfId(bookshelfId)
        await refetchAll()
      } catch (e) {
        console.error('Failed to switch library', e)
      }
    },
    [refetchAll],
  )

  // Section refs for scrolling from Pixi scene to bestseller / private zones.
  const bestsellerSectionRef = useRef<HTMLElement | null>(null)
  const privateSectionRef = useRef<HTMLElement | null>(null)
  const scrollToSection = useCallback((ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const favorites = useMemo(
    () =>
      library?.bookshelves
        .flatMap((s) => s.books)
        .filter((b) => b.isFavorite) ?? [],
    [library],
  )

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
        librarySlug={library.slug}
        isPublic={library.isPublic}
        storageCount={storageCount}
        onImport={() => setImporting(true)}
        onOpenStorage={() => setStorageOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSwitched={refetchAll}
        onCreateLibrary={() => setCreatingLibrary(true)}
        onOpenLibrarian={() => setLibrarianOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
        <PixiLibraryScene
          library={library}
          favoritesCount={favorites.length}
          storageCount={storageCount}
          privateCount={library.bookshelves.filter((s) => s.zone === 'PRIVATE').length}
          onShelfClick={handleShelfClickInScene}
          onEntranceClick={() => setSettingsOpen(true)}
          onBestsellerClick={() => scrollToSection(bestsellerSectionRef)}
          onPrivateClick={() => scrollToSection(privateSectionRef)}
          onStorageClick={() => setStorageOpen(true)}
        />

        {favorites.length > 0 && (
          <section ref={bestsellerSectionRef} className="scroll-mt-24">
            <SectionHeader
              title="✨ 베스트셀러"
              subtitle={`즐겨찾기한 ${favorites.length}권 · 도서관 입구 진열대에 놓여있습니다`}
            />
            <Card padding="md">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {favorites.slice(0, 20).map((book) => (
                  <li key={book.id} className="flex items-center gap-3 px-3 py-2.5 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors">
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
                    <span className="text-(--color-walnut-500) text-sm" title="베스트셀러">★</span>
                  </li>
                ))}
              </ul>
              {favorites.length > 20 && (
                <p className="text-xs text-(--color-ink-muted) text-center mt-3">
                  ⌂ 베스트셀러 진열대는 최대 20권까지 보여줍니다 (현재 {favorites.length}권 중 20권 표시)
                </p>
              )}
            </Card>
          </section>
        )}

        <Section
          title="📚 책장"
          subtitle={`${library.bookshelves.length} / ${MAX_BOOKSHELVES_PER_LIBRARY} · 한 도서관에 최대 ${MAX_BOOKSHELVES_PER_LIBRARY}개`}
        >
          <ShelfList
            shelves={library.bookshelves.filter((s) => s.zone === 'PUBLIC')}
            onAddBook={setAddingBookFor}
            onEditShelf={setEditingShelf}
            onEditBook={setEditingBook}
            registerCard={registerShelfCard}
          />
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setAddingShelf(true)}
              disabled={library.bookshelves.length >= MAX_BOOKSHELVES_PER_LIBRARY}
            >
              {library.bookshelves.length >= MAX_BOOKSHELVES_PER_LIBRARY
                ? `책장이 가득찼어요 (${MAX_BOOKSHELVES_PER_LIBRARY}/${MAX_BOOKSHELVES_PER_LIBRARY})`
                : '+ 새 책장 추가'}
            </Button>
            {library.bookshelves.length >= MAX_BOOKSHELVES_PER_LIBRARY && (
              <button
                type="button"
                onClick={() => setCreatingLibrary(true)}
                className="text-sm text-(--color-walnut-500) hover:text-(--color-walnut-700) font-medium"
              >
                새 도서관 만들기 →
              </button>
            )}
          </div>
        </Section>

        <section ref={privateSectionRef} className="scroll-mt-24">
          <SectionHeader
            title="🔒 프라이빗 룸"
            subtitle={`${library.bookshelves.filter(s => s.zone === 'PRIVATE').length}개 · 공유해도 보이지 않음`}
          />
          <ShelfList
            shelves={library.bookshelves.filter((s) => s.zone === 'PRIVATE')}
            onAddBook={setAddingBookFor}
            onEditShelf={setEditingShelf}
            onEditBook={setEditingBook}
            registerCard={registerShelfCard}
          />
        </section>
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
      <LibrarySettingsModal
        open={settingsOpen}
        library={library}
        onClose={() => setSettingsOpen(false)}
        onSaved={refetch}
      />
      <CreateLibraryModal
        open={creatingLibrary}
        onClose={() => setCreatingLibrary(false)}
        onCreated={refetchAll}
      />
      <LibrarianModal
        open={librarianOpen}
        onClose={() => setLibrarianOpen(false)}
        onScrollToShelf={handleShelfClickInScene}
        onJumpToOtherLibrary={handleLibrarianJump}
        onOpenStorage={() => setStorageOpen(true)}
      />
    </div>
  )
}

function Header({
  me,
  libraryTitle,
  librarySlug,
  isPublic,
  storageCount,
  onImport,
  onOpenStorage,
  onOpenSettings,
  onSwitched,
  onCreateLibrary,
  onOpenLibrarian,
}: {
  me: Me
  libraryTitle: string
  librarySlug: string
  isPublic: boolean
  storageCount: number
  onImport: () => void
  onOpenStorage: () => void
  onOpenSettings: () => void
  onSwitched: () => void
  onCreateLibrary: () => void
  onOpenLibrarian: () => void
}) {
  return (
    <header className="border-b border-(--color-line) bg-(--color-surface-raised)/60 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <LibrarySwitcher
          currentTitle={libraryTitle}
          onSwitched={onSwitched}
          onRequestCreate={onCreateLibrary}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLibrarian}
            className="text-sm px-3 py-1.5 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors text-(--color-ink) flex items-center gap-1.5"
            title="책 찾기"
          >
            <span>📖</span>
            <span className="hidden md:inline">사서</span>
          </button>
          <ShareButton
            username={me.username}
            slug={librarySlug}
            isPublic={isPublic}
            onSettings={onOpenSettings}
          />
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
          <IconButton label="도서관 설정" onClick={onOpenSettings}>
            <SettingsIcon />
          </IconButton>
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

function ShareButton({
  username,
  slug,
  isPublic,
  onSettings,
}: {
  username: string
  slug: string
  isPublic: boolean
  onSettings: () => void
}) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/u/${username}/${slug}`

  const handleClick = async () => {
    if (!isPublic) {
      const ok = window.confirm(
        '도서관이 비공개 상태입니다. 공개 도서관으로 바꾸려면 설정을 열까요?',
      )
      if (ok) onSettings()
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('아래 링크를 복사하세요', url)
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick}>
      {copied ? '✓ 복사됨' : isPublic ? '공유' : '공유 (비공개)'}
    </Button>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.5v1.8M8 12.7v1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M1.5 8h1.8M12.7 8h1.8M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
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
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </section>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl font-semibold text-(--color-ink-strong) tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-(--color-ink-muted) mt-1">{subtitle}</p>
    </div>
  )
}

function ShelfList({
  shelves,
  onAddBook,
  onEditShelf,
  onEditBook,
  registerCard,
}: {
  shelves: Bookshelf[]
  onAddBook: (shelf: Bookshelf) => void
  onEditShelf: (shelf: Bookshelf) => void
  onEditBook: (book: Book) => void
  registerCard?: (id: number, el: HTMLElement | null) => void
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
          registerCard={registerCard}
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
  registerCard,
}: {
  shelf: Bookshelf
  onAddBook: () => void
  onEditShelf: () => void
  onEditBook: (book: Book) => void
  registerCard?: (id: number, el: HTMLElement | null) => void
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
    <Card
      padding="md"
      ref={(el) => registerCard?.(shelf.id, el)}
      className="transition-shadow scroll-mt-24"
    >
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
