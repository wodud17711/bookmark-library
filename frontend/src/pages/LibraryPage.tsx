import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { switchCurrentLibrary, uploadOgImage } from '../api/library'

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
  /** Bestseller section collapse state. Defaults to expanded. */
  const [bestsellerExpanded, setBestsellerExpanded] = useState(true)
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

  // Wrapper around the Pixi scene so we can find its canvas after draw and
  // snapshot it for the library's OG image.
  const sceneWrapRef = useRef<HTMLDivElement | null>(null)

  /**
   * After the Pixi scene draws (debounced 1.5s after each library data
   * change), capture the canvas as a PNG and upload it as the library's OG
   * image. Skipped on mobile portrait so social previews always use the
   * desktop 16:9 composition. Failures are silent — this is a background
   * sync, not a user-visible action.
   */
  useEffect(() => {
    if (!library) return
    if (typeof window === 'undefined') return
    if (window.innerWidth < 600) return // desktop snapshots only

    const t = window.setTimeout(() => {
      const canvas = sceneWrapRef.current?.querySelector('canvas')
      if (!canvas) return
      canvas.toBlob(
        (blob) => {
          if (!blob) return
          uploadOgImage(library.id, blob).catch(() => {
            // Silent — owner is just browsing; don't surface failures here.
          })
        },
        'image/png',
        0.92,
      )
    }, 1500)
    return () => window.clearTimeout(t)
  }, [library])

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
        <div ref={sceneWrapRef}>
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
        </div>

        {favorites.length > 0 && (
          <section ref={bestsellerSectionRef} className="scroll-mt-24">
            <CollapseHeader
              expanded={bestsellerExpanded}
              onToggle={() => setBestsellerExpanded((v) => !v)}
              title="✨ 베스트셀러"
              subtitle={`즐겨찾기한 ${favorites.length}권 · 도서관 입구 진열대에 놓여있습니다`}
            />
            {bestsellerExpanded && (
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
            )}
          </section>
        )}

        <Section
          title="📚 책장"
          subtitle={`${library.bookshelves.length} / ${MAX_BOOKSHELVES_PER_LIBRARY} · 한 도서관에 최대 ${MAX_BOOKSHELVES_PER_LIBRARY}개`}
        >
          <div className="mb-4 flex items-center gap-3">
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
          <ShelfList
            shelves={library.bookshelves.filter((s) => s.zone === 'PUBLIC')}
            onAddBook={setAddingBookFor}
            onEditShelf={setEditingShelf}
            onEditBook={setEditingBook}
            registerCard={registerShelfCard}
          />
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

      <footer className="mt-12 py-8 border-t border-(--color-line-soft) text-center space-y-3">
        <p className="text-xs text-(--color-ink-faint)">
          ⌂ {library.bookshelves.length}개 책장 · {totalBooks}권 보관 중
        </p>
        <p className="text-xs text-(--color-ink-faint) flex items-center justify-center gap-3">
          <Link to="/terms" className="hover:text-(--color-walnut-500) transition-colors">
            이용약관
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacy" className="hover:text-(--color-walnut-500) transition-colors">
            개인정보처리방침
          </Link>
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
      <BackToTopButton />
    </div>
  )
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="맨 위로"
      title="맨 위로"
      className="fixed bottom-5 right-5 z-30 w-11 h-11 rounded-full bg-(--color-walnut-500) text-white shadow-(--shadow-lg) hover:bg-(--color-walnut-700) active:scale-95 transition-all flex items-center justify-center"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M9 14V4M9 4L4 9M9 4L14 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

// Below this width, the header collapses non-essential actions (Share, Storage,
// Settings, Logout) into a hamburger menu and hides Import entirely (Chrome
// mobile cannot export bookmarks as HTML, so importing has no realistic flow).
const HEADER_MOBILE_BREAKPOINT = 600

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
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.innerWidth < HEADER_MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsMobile(window.innerWidth < HEADER_MOBILE_BREAKPOINT)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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
          {isMobile ? (
            <HamburgerMenu
              username={me.username}
              storageCount={storageCount}
              isPublic={isPublic}
              shareUrl={`${window.location.origin}/u/${me.username}/${librarySlug}`}
              onOpenStorage={onOpenStorage}
              onOpenSettings={onOpenSettings}
            />
          ) : (
            <>
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
              <span className="hidden md:inline text-sm text-(--color-ink-muted)">
                @{me.username}
              </span>
              <a
                href="/logout"
                className="text-sm text-(--color-ink-muted) hover:text-(--color-walnut-500) transition-colors px-2"
              >
                로그아웃
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function HamburgerMenu({
  username,
  storageCount,
  isPublic,
  shareUrl,
  onOpenStorage,
  onOpenSettings,
}: {
  username: string
  storageCount: number
  isPublic: boolean
  shareUrl: string
  onOpenStorage: () => void
  onOpenSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const [shareLabel, setShareLabel] = useState('공유')
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleShare = async () => {
    if (!isPublic) {
      const ok = window.confirm(
        '도서관이 비공개 상태입니다. 공개 도서관으로 바꾸려면 설정을 열까요?',
      )
      if (ok) {
        setOpen(false)
        onOpenSettings()
      }
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareLabel('✓ 복사됨')
      window.setTimeout(() => setShareLabel('공유'), 1500)
    } catch {
      window.prompt('아래 링크를 복사하세요', shareUrl)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="text-sm px-2.5 py-1.5 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors text-(--color-ink)"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-raised) shadow-(--shadow-md) py-1 z-20"
        >
          <MenuItem
            onClick={() => {
              setOpen(false)
              onOpenStorage()
            }}
            label={`📦 창고 (${storageCount})`}
          />
          <MenuItem
            onClick={handleShare}
            label={isPublic ? shareLabel : '공유 (비공개)'}
          />
          <MenuItem
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
            label="⚙ 도서관 설정"
          />
          <div className="my-1 border-t border-(--color-line-soft)" />
          <div className="px-3 py-1.5 text-xs text-(--color-ink-muted)">@{username}</div>
          <a
            href="/logout"
            className="block px-3 py-2 text-sm text-(--color-ink-muted) hover:bg-(--color-surface-sunken) hover:text-(--color-walnut-500) transition-colors"
          >
            로그아웃
          </a>
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-sm text-(--color-ink-strong) hover:bg-(--color-surface-sunken) transition-colors"
    >
      {label}
    </button>
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
  const [expanded, setExpanded] = useState(true)
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
      <div className={`flex items-center justify-between ${expanded ? 'mb-3' : ''}`}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? '책장 접기' : '책장 펼치기'}
          className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-(--radius-sm) -m-1 p-1 hover:bg-(--color-surface-sunken) transition-colors"
        >
          <Chevron expanded={expanded} />
          <h3 className="font-display text-lg font-semibold text-(--color-ink-strong) truncate">
            {shelf.title}
          </h3>
          <span className={`text-xs shrink-0 ${usageHue}`}>
            {shelf.books.length} / {shelf.maxBooks}
          </span>
        </button>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="sm" onClick={onAddBook} disabled={isFull}>
            {isFull ? '책장 가득' : '+ 책 추가'}
          </Button>
          <IconButton label="책장 편집" onClick={onEditShelf} size="sm">
            <EditIcon />
          </IconButton>
        </div>
      </div>

      {expanded &&
        (shelf.books.length === 0 ? (
          <EmptyShelf onAddBook={onAddBook} />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {shelf.books.map((book) => (
              <BookRow key={book.id} book={book} onEdit={() => onEditBook(book)} />
            ))}
          </ul>
        ))}
    </Card>
  )
}

/**
 * Section header with a chevron toggle. Used for the bestseller section above
 * the bookshelves so the owner can collapse it once they've scanned the list.
 */
function CollapseHeader({
  title,
  subtitle,
  expanded,
  onToggle,
}: {
  title: string
  subtitle: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="w-full text-left mb-4 flex items-start gap-3 rounded-(--radius-sm) -m-1 p-1 hover:bg-(--color-surface-sunken) transition-colors"
    >
      <Chevron expanded={expanded} className="mt-2" />
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-2xl font-semibold text-(--color-ink-strong) tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-(--color-ink-muted) mt-1">{subtitle}</p>
      </div>
    </button>
  )
}

function Chevron({ expanded, className = '' }: { expanded: boolean; className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-(--color-ink-muted) transition-transform duration-200 ${
        expanded ? '' : '-rotate-90'
      } ${className}`}
    >
      <path
        d="M3 5L7 9L11 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
        className="md:opacity-0 md:group-hover:opacity-100 transition-opacity
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
