import { useEffect, useState } from 'react'
import { Button, Modal, TextInput } from '../ui'
import { createBook } from '../../api/library'
import { extractApiErrorMessage } from '../../api/client'
import { BookCoverPicker } from './BookCoverPicker'

const DEFAULT_COVER = '#3D2817'
// Per-browser preference: which cover color the user last picked when adding
// a new book. Saves the friction of finding the same color on every add.
const LAST_COVER_KEY = 'bookmark.lastBookCover'
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

function readLastCover(): string {
  try {
    const stored = localStorage.getItem(LAST_COVER_KEY)
    if (stored && HEX_RE.test(stored)) return stored.toUpperCase()
  } catch {
    // localStorage may throw in private mode / quota issues — silently fall back.
  }
  return DEFAULT_COVER
}

interface Props {
  open: boolean
  bookshelfId: number | null
  bookshelfTitle: string
  onClose: () => void
  onCreated: () => void
}

export function AddBookModal({ open, bookshelfId, bookshelfTitle, onClose, onCreated }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [coverColor, setCoverColor] = useState(DEFAULT_COVER)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCoverColor(readLastCover())
    } else {
      setUrl('')
      setTitle('')
      setError(null)
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
      await createBook({
        bookshelfId,
        url: normalizedUrl,
        title: title.trim() || undefined,
        coverColor,
      })
      try {
        localStorage.setItem(LAST_COVER_KEY, coverColor)
      } catch {
        // localStorage may fail; the book was created successfully so swallow.
      }
      onCreated()
      onClose()
    } catch (err) {
      setError(extractApiErrorMessage(err, '책 추가에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
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
            {submitting ? '추가 중...' : '책장에 꽂기'}
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
      </form>
    </Modal>
  )
}
