import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicLibrary, type Bookshelf, type Library, type Book } from '../api/library'
import { extractApiErrorMessage } from '../api/client'
import { Button, Card } from '../components/ui'
import { PixiLibraryScene } from '../components/library/PixiLibraryScene'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; library: Library }
  | { status: 'not_found' }
  | { status: 'error'; message: string }

export default function PublicLibraryPage() {
  const { username, slug } = useParams<{ username: string; slug?: string }>()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!username) {
      setState({ status: 'not_found' })
      return
    }
    setState({ status: 'loading' })
    fetchPublicLibrary(username, slug)
      .then((library) => setState({ status: 'ready', library }))
      .catch((err: unknown) => {
        const status =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined
        if (status === 404) {
          setState({ status: 'not_found' })
        } else {
          setState({ status: 'error', message: extractApiErrorMessage(err, '로드 실패') })
        }
      })
  }, [username])

  if (state.status === 'loading') {
    return <CenteredMessage>도서관 문 여는 중…</CenteredMessage>
  }

  if (state.status === 'not_found') {
    return (
      <CenteredMessage>
        <h1 className="font-display text-2xl font-semibold text-(--color-ink-strong) mb-2">
          도서관을 찾을 수 없습니다
        </h1>
        <p className="text-(--color-ink-muted) mb-6">
          비공개 상태이거나, 존재하지 않는 도서관일 수 있습니다.
        </p>
        <Button onClick={() => (window.location.href = '/')}>홈으로</Button>
      </CenteredMessage>
    )
  }

  if (state.status === 'error') {
    return (
      <CenteredMessage>
        <p className="text-(--color-danger)">에러: {state.message}</p>
      </CenteredMessage>
    )
  }

  const library = state.library
  return <PublicLibraryView library={library} />
}

function PublicLibraryView({ library }: { library: Library }) {
  const totalBooks = useMemo(
    () => library.bookshelves.reduce((sum, s) => sum + s.books.length, 0),
    [library],
  )
  const favorites = useMemo(
    () =>
      library.bookshelves
        .flatMap((s) => s.books)
        .filter((b) => b.isFavorite)
        .slice(0, 20),
    [library],
  )

  // Refs for Pixi-scene → list-card scrolling
  const shelfCardRefs = useRef<Map<number, HTMLElement>>(new Map())
  const bestsellerSectionRef = useRef<HTMLElement | null>(null)
  const registerShelfCard = useCallback((id: number, el: HTMLElement | null) => {
    if (el) shelfCardRefs.current.set(id, el)
    else shelfCardRefs.current.delete(id)
  }, [])
  const handleShelfClick = useCallback((id: number) => {
    const el = shelfCardRefs.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-(--color-walnut-300)')
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-(--color-walnut-300)'), 1500)
    }
  }, [])
  const handleBestsellerClick = useCallback(() => {
    bestsellerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])
  const noop = useCallback(() => {}, [])

  return (
    <div className="min-h-full flex flex-col">
      <PublicHeader library={library} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-12">
        <PixiLibraryScene
          library={library}
          favoritesCount={favorites.length}
          storageCount={0}
          privateCount={0}
          onShelfClick={handleShelfClick}
          onEntranceClick={noop}
          onBestsellerClick={handleBestsellerClick}
          onPrivateClick={noop}
          onStorageClick={noop}
          readonly
        />

        {library.welcomeMessage && (
          <WelcomeBanner message={library.welcomeMessage} ownerName={library.ownerDisplayName} />
        )}

        {favorites.length > 0 && (
          <section ref={bestsellerSectionRef} className="scroll-mt-24">
            <SectionTitle title="✨ 베스트셀러" subtitle={`도서관장이 꼽은 ${favorites.length}권`} />
            <Card padding="md">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {favorites.map((book) => (
                  <BookRow key={book.id} book={book} />
                ))}
              </ul>
            </Card>
          </section>
        )}

        <section>
          <SectionTitle title="📚 책장" subtitle={`${library.bookshelves.length}개 책장 · ${totalBooks}권`} />
          {library.bookshelves.length === 0 ? (
            <Card padding="lg" className="text-center">
              <p className="text-sm text-(--color-ink-muted)">아직 책장이 비어있습니다.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {library.bookshelves.map((shelf) => (
                <PublicShelfCard key={shelf.id} shelf={shelf} registerCard={registerShelfCard} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 py-10 border-t border-(--color-line-soft) text-center bg-(--color-surface-sunken)">
        <p className="text-sm text-(--color-ink-muted) mb-3">
          나만의 도서관을 만들고 꾸며보세요.
        </p>
        <Button onClick={() => (window.location.href = '/login')} size="lg">
          내 도서관 만들기
        </Button>
        <p className="mt-6 text-xs text-(--color-ink-faint)">
          📚 북마크 도서관
        </p>
      </footer>
    </div>
  )
}

function PublicHeader({ library }: { library: Library }) {
  return (
    <header className="border-b border-(--color-line) bg-(--color-surface-raised)/60 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-(--color-ink-strong) tracking-tight truncate">
            {library.title}
          </h1>
          <p className="text-xs text-(--color-ink-muted) mt-0.5 truncate">
            @{library.ownerUsername} · {library.ownerDisplayName}
          </p>
        </div>
        <a
          href="/login"
          className="text-sm text-(--color-walnut-500) hover:text-(--color-walnut-700) font-medium whitespace-nowrap"
        >
          내 도서관 만들기 →
        </a>
      </div>
    </header>
  )
}

function WelcomeBanner({ message, ownerName }: { message: string; ownerName: string }) {
  return (
    <Card variant="raised" padding="lg" className="bg-(--color-walnut-50) border-(--color-walnut-100)">
      <div className="flex items-start gap-4">
        <span className="text-2xl shrink-0" aria-hidden="true">🚪</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-(--color-walnut-500) font-semibold mb-2">
            도서관장의 한마디
          </p>
          <p className="text-(--color-ink-strong) leading-relaxed whitespace-pre-wrap break-words">
            {message}
          </p>
          <p className="mt-3 text-xs text-(--color-ink-muted)">— {ownerName}</p>
        </div>
      </div>
    </Card>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl font-semibold text-(--color-ink-strong) tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-(--color-ink-muted) mt-1">{subtitle}</p>
    </div>
  )
}

function PublicShelfCard({
  shelf,
  registerCard,
}: {
  shelf: Bookshelf
  registerCard?: (id: number, el: HTMLElement | null) => void
}) {
  return (
    <Card
      padding="md"
      ref={(el) => registerCard?.(shelf.id, el)}
      className="transition-shadow scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-semibold text-(--color-ink-strong)">{shelf.title}</h3>
        <span className="text-xs text-(--color-ink-muted)">{shelf.books.length}권</span>
      </div>
      {shelf.books.length === 0 ? (
        <p className="text-sm text-(--color-ink-muted) italic py-4 text-center">비어있는 책장</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {shelf.books.map((book) => (
            <BookRow key={book.id} book={book} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function BookRow({ book }: { book: Book }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-(--radius-sm) hover:bg-(--color-surface-sunken) transition-colors">
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
      {book.isFavorite && (
        <span className="text-(--color-walnut-500) text-sm" title="베스트셀러">
          ★
        </span>
      )}
    </li>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="text-center max-w-md">{children}</div>
    </div>
  )
}
