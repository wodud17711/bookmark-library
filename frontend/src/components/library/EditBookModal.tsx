import { useEffect, useState } from 'react'
import { Button, Modal, TextInput } from '../ui'
import {
  deleteBook,
  moveBookToStorage,
  updateBook,
  type Book,
  type Bookshelf,
} from '../../api/library'
import { extractApiErrorMessage } from '../../api/client'

interface Props {
  open: boolean
  book: Book | null
  /** Bookshelf containing the book — used for "current shelf" indicator. */
  currentShelfId: number | null
  /** All shelves so the user can move the book between them. */
  shelves: Bookshelf[]
  onClose: () => void
  onChanged: () => void
}

export function EditBookModal({
  open,
  book,
  currentShelfId,
  shelves,
  onClose,
  onChanged,
}: Props) {
  const [title, setTitle] = useState('')
  const [siteName, setSiteName] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [shelfId, setShelfId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingStorage, setConfirmingStorage] = useState(false)

  useEffect(() => {
    if (book) {
      setTitle(book.title)
      setSiteName(book.siteName ?? '')
      setIsFavorite(book.isFavorite)
      setShelfId(currentShelfId)
      setError(null)
      setConfirmingDelete(false)
      setConfirmingStorage(false)
      setSubmitting(false) // guard against leftover state after a previous action
    }
  }, [book, currentShelfId])

  if (!book) return null

  const targetShelf = shelves.find((s) => s.id === shelfId)
  const movingShelves = shelfId !== null && shelfId !== currentShelfId
  const targetFull =
    movingShelves && targetShelf && targetShelf.books.length >= targetShelf.maxBooks

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) {
      setError('제목은 비울 수 없습니다.')
      return
    }
    if (targetFull) {
      setError('옮기려는 책장이 가득 찼습니다.')
      return
    }
    setSubmitting(true)
    try {
      await updateBook(book.id, {
        title: title.trim(),
        siteName: siteName.trim(),
        isFavorite,
        ...(movingShelves && shelfId !== null ? { bookshelfId: shelfId } : {}),
      })
      onChanged()
      onClose()
    } catch (err) {
      setError(extractApiErrorMessage(err, '저장 실패'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await deleteBook(book.id)
      onChanged()
      onClose()
    } catch (err) {
      setError(extractApiErrorMessage(err, '삭제 실패'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleMoveToStorage = async () => {
    setSubmitting(true)
    try {
      await moveBookToStorage(book.id)
      onChanged()
      onClose()
    } catch (err) {
      setError(extractApiErrorMessage(err, '창고 이동 실패'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="책 편집"
      footer={
        confirmingDelete ? (
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={submitting}>
              취소
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={submitting}>
              {submitting ? '삭제 중...' : '삭제'}
            </Button>
          </>
        ) : confirmingStorage ? (
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmingStorage(false)} disabled={submitting}>
              취소
            </Button>
            <Button type="button" onClick={handleMoveToStorage} disabled={submitting}>
              {submitting ? '옮기는 중...' : '창고로 옮기기'}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)} disabled={submitting}>
              삭제
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" form="edit-book-form" disabled={submitting || targetFull}>
              {submitting ? '저장 중...' : '저장'}
            </Button>
          </>
        )
      }
    >
      {confirmingDelete ? (
        <p className="text-(--color-ink) leading-relaxed">
          <strong className="text-(--color-ink-strong)">"{book.title}"</strong>를 책장에서 빼낼까요?
          <span className="block mt-1 text-sm text-(--color-ink-muted)">되돌릴 수 없습니다.</span>
        </p>
      ) : confirmingStorage ? (
        <p className="text-(--color-ink) leading-relaxed">
          <strong className="text-(--color-ink-strong)">"{book.title}"</strong>를 📦 창고로 옮기시겠어요?
          <span className="block mt-1 text-sm text-(--color-ink-muted)">
            창고에서 다른 책장으로 다시 옮길 수 있습니다.
          </span>
        </p>
      ) : (
        <form id="edit-book-form" onSubmit={handleSave} className="space-y-4">
          <div className="text-xs text-(--color-ink-muted) p-2 bg-(--color-surface-sunken) rounded-(--radius-xs) truncate">
            {book.url}
          </div>
          <TextInput
            label="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={256}
            error={error ?? undefined}
          />
          <TextInput
            label="사이트 이름 (선택)"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            maxLength={128}
          />

          <div>
            <label
              htmlFor="edit-book-shelf"
              className="text-sm font-medium text-(--color-ink-strong) block mb-1.5"
            >
              책장
            </label>
            <select
              id="edit-book-shelf"
              value={shelfId ?? ''}
              onChange={(e) => setShelfId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3.5 py-2.5 text-[15px] bg-(--color-surface-raised)
                         text-(--color-ink-strong) border border-(--color-line) rounded-(--radius-sm)
                         focus:outline-none focus:border-(--color-walnut-500) focus:ring-2 focus:ring-(--color-walnut-300)/40"
            >
              {shelves.map((s) => {
                const full = s.books.length >= s.maxBooks && s.id !== currentShelfId
                return (
                  <option key={s.id} value={s.id} disabled={full}>
                    {s.title} ({s.books.length}/{s.maxBooks})
                    {s.zone === 'PRIVATE' ? ' 🔒' : ''}
                    {s.id === currentShelfId ? ' · 현재' : ''}
                    {full ? ' · 가득' : ''}
                  </option>
                )
              })}
            </select>
            {movingShelves && targetShelf && (
              <p className="mt-1.5 text-xs text-(--color-walnut-500)">
                저장하면 <strong>{targetShelf.title}</strong>로 옮겨집니다.
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 accent-(--color-walnut-500)"
            />
            <span className="text-sm text-(--color-ink)">
              ⭐ 베스트셀러로 (즐겨찾기)
            </span>
          </label>

          <div className="pt-3 mt-3 border-t border-(--color-line-soft)">
            <button
              type="button"
              onClick={() => setConfirmingStorage(true)}
              className="text-sm text-(--color-ink-muted) hover:text-(--color-walnut-500) transition-colors flex items-center gap-2"
            >
              <span>📦</span>
              <span>창고로 옮기기</span>
              <span className="text-xs text-(--color-ink-faint)">— 책장에서 빼서 보관</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
