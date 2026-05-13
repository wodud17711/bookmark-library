import { useEffect, useState } from 'react'
import { Button, Modal, TextInput } from '../ui'
import { createBook } from '../../api/library'
import type { Book } from '../../api/library'
import { extractApiErrorMessage } from '../../api/client'
import { BookCoverPicker } from './BookCoverPicker'
import { lastUsedColor, recordColor } from '../../utils/bookCoverPalette'

interface Props {
  open: boolean
  bookshelfId: number | null
  bookshelfTitle: string
  onClose: () => void
  onCreated: () => void
  /**
   * Whether the owner has AI features enabled at the account level. Controls
   * whether we show the "잠시만요, AI가 분류 중이에요" hint while waiting on the
   * backend's synchronous Gemini call.
   */
  aiEnabled: boolean
}

export function AddBookModal({
  open,
  bookshelfId,
  bookshelfTitle,
  onClose,
  onCreated,
  aiEnabled,
}: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [coverColor, setCoverColor] = useState('#3D2817')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // After successful create we keep the modal open for a moment to surface
  // the AI result — closing immediately would hide the headline feature.
  const [createdBook, setCreatedBook] = useState<Book | null>(null)

  useEffect(() => {
    if (open) {
      setCoverColor(lastUsedColor())
    } else {
      setUrl('')
      setTitle('')
      setError(null)
      setCreatedBook(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) {
      setError('URL을 입력해주세요.')
      return
    }
    if (!bookshelfId) return

    const normalizedUrl = url.trim().match(/^https?:\/\//i) ? url.trim() : `https://${url.trim()}`
    try {
      new URL(normalizedUrl)
    } catch {
      setError('올바른 URL 형식이 아닙니다.')
      return
    }

    setSubmitting(true)
    try {
      const book = await createBook({
        bookshelfId,
        url: normalizedUrl,
        title: title.trim() || undefined,
        coverColor,
      })
      recordColor(coverColor)
      onCreated()
      const hasAiResult = (book.tags?.length ?? 0) > 0 || Boolean(book.aiSummary)
      if (aiEnabled && hasAiResult) {
        // Hold the modal open with the result panel; user dismisses manually.
        setCreatedBook(book)
      } else {
        onClose()
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, '책 추가에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (createdBook) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="AI 자동 분류 완료"
        footer={
          <Button type="button" onClick={onClose}>
            확인
          </Button>
        }
      >
        <AiResultPanel book={createdBook} />
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`책 추가 — ${bookshelfTitle}`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button type="submit" form="add-book-form" disabled={submitting}>
            {submitting ? (aiEnabled ? 'AI가 분류 중…' : '추가 중...') : '책장에 꽂기'}
          </Button>
        </>
      }
    >
      <form id="add-book-form" onSubmit={handleSubmit} className="space-y-4">
        <TextInput
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          autoFocus
          required
          error={error ?? undefined}
        />
        <TextInput
          label="제목 (선택)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="비워두면 사이트 이름이 자동으로 들어갑니다"
          maxLength={256}
        />
        <BookCoverPicker value={coverColor} onChange={setCoverColor} />
        {aiEnabled && (
          <p className="text-xs text-(--color-ink-faint) leading-relaxed">
            🤖 책장에 꽂는 동안 AI가 페이지를 읽고 태그·요약을 자동으로 달아드려요.
            (설정에서 끌 수 있어요)
          </p>
        )}
      </form>
    </Modal>
  )
}

function AiResultPanel({ book }: { book: Book }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-(--color-ink-strong) mb-1">📕 {book.title}</p>
        {book.siteName && (
          <p className="text-xs text-(--color-ink-faint)">{book.siteName}</p>
        )}
      </div>
      {book.tags && book.tags.length > 0 && (
        <div>
          <p className="text-xs text-(--color-ink-muted) mb-2">자동 태그</p>
          <div className="flex flex-wrap gap-1.5">
            {book.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs
                           bg-(--color-walnut-100) text-(--color-walnut-700)
                           border border-(--color-walnut-300)/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      {book.aiSummary && (
        <div>
          <p className="text-xs text-(--color-ink-muted) mb-2">한 줄 요약</p>
          <p className="text-sm text-(--color-ink) leading-relaxed bg-(--color-surface-sunken) rounded-md px-3 py-2.5">
            {book.aiSummary}
          </p>
        </div>
      )}
    </div>
  )
}
