import { useEffect, useState } from 'react'
import { Button, Modal, TextInput } from '../ui'
import { createBook } from '../../api/library'

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
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
      })
      onCreated()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '책 추가에 실패했습니다.'
      setError(msg)
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
      </form>
    </Modal>
  )
}
