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
  // Tracks whether the user clicked the BookCoverPicker. False means the
  // current coverColor is just the lastUsedColor default — backend may then
  // override it with theme-color/AI suggestion when going through the AI flow.
  const [userPickedColor, setUserPickedColor] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // After successful create we keep the modal open for a moment to surface
  // the AI result — closing immediately would hide the headline feature.
  const [createdBook, setCreatedBook] = useState<Book | null>(null)
  // True when the persisted book.coverColor came from theme-color/AI rather
  // than the lastUsedColor we sent. Drives the "책 색상도 골라드렸어요" line
  // in the result panel.
  const [colorAutoApplied, setColorAutoApplied] = useState(false)

  useEffect(() => {
    if (open) {
      setCoverColor(lastUsedColor())
      setUserPickedColor(false)
    } else {
      setUrl('')
      setTitle('')
      setError(null)
      setCreatedBook(null)
      setColorAutoApplied(false)
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

    const trimmedTitle = title.trim()
    setSubmitting(true)
    try {
      const book = await createBook({
        bookshelfId,
        url: normalizedUrl,
        title: trimmedTitle || undefined,
        coverColor,
        coverColorAutoPicked: !userPickedColor,
      })
      // Remember the actual color persisted on the book (which may have been
      // upgraded by AI/theme-color) so the next add-modal opens with that.
      recordColor(book.coverColor)
      onCreated()
      // The AI value-add now lives in book.title itself when the user left
      // the title blank — show it back to them so they know AI did something.
      // If they typed their own title, AI didn't run (or didn't override) and
      // there's nothing new to surface.
      if (aiEnabled && !trimmedTitle) {
        // Color counts as "AI applied" when the persisted hex differs from
        // what we sent. Catches both the theme-color and AI-color paths.
        setColorAutoApplied(
          !userPickedColor &&
            book.coverColor.toUpperCase() !== coverColor.toUpperCase(),
        )
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
        title="AI가 책을 꽂아줬어요"
        footer={
          <Button type="button" onClick={onClose}>
            확인
          </Button>
        }
      >
        <AiResultPanel book={createdBook} colorAutoApplied={colorAutoApplied} />
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
            {submitting
              ? aiEnabled && !title.trim()
                ? 'AI가 제목 짓는 중…'
                : '추가 중...'
              : '책장에 꽂기'}
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
          placeholder={aiEnabled ? '비워두면 AI가 제목을 골라드려요' : '비워두면 사이트 이름이 자동으로 들어갑니다'}
          maxLength={256}
        />
        <BookCoverPicker
          value={coverColor}
          onChange={(c) => {
            setCoverColor(c)
            setUserPickedColor(true)
          }}
        />
        {aiEnabled && !title.trim() && (
          <p className="text-xs text-(--color-ink-faint) leading-relaxed">
            🤖 제목을 비우면 AI가 페이지를 읽고 짧은 제목과 어울리는 책 색상까지 골라드려요.
            무료 모델을 사용 중이라 시간이 좀 걸릴 수 있어요. (설정에서 끌 수 있어요)
          </p>
        )}
      </form>
    </Modal>
  )
}

function AiResultPanel({ book, colorAutoApplied }: { book: Book; colorAutoApplied: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-(--color-walnut-500) font-semibold">
        🤖 AI가 골라준 제목
      </p>
      <div
        className="flex items-stretch gap-3 bg-(--color-surface-sunken) rounded-md px-3 py-2.5"
      >
        <span
          className="w-1.5 self-stretch rounded-(--radius-xs) shrink-0"
          style={{ background: book.coverColor }}
          aria-hidden="true"
        />
        <p className="text-base font-medium text-(--color-ink-strong) leading-snug flex-1 min-w-0">
          {book.title}
        </p>
      </div>
      {colorAutoApplied && (
        <p className="text-xs text-(--color-ink-muted) flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm border border-(--color-line)"
            style={{ background: book.coverColor }}
            aria-hidden="true"
          />
          책 색상도 사이트 분위기에 맞춰드렸어요.
        </p>
      )}
      <p className="text-xs text-(--color-ink-faint) leading-relaxed">
        마음에 들지 않으면 책장에서 책을 클릭해 편집할 수 있어요.
      </p>
    </div>
  )
}
