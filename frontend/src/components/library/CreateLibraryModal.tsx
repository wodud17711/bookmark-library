import { useEffect, useState } from 'react'
import { Button, Modal, TextInput } from '../ui'
import { createLibrary, fetchMyLibraries, MAX_LIBRARIES_PER_USER } from '../../api/library'
import { extractApiErrorMessage } from '../../api/client'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateLibraryModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [libraryCount, setLibraryCount] = useState<number | null>(null)
  const atCap = libraryCount !== null && libraryCount >= MAX_LIBRARIES_PER_USER

  useEffect(() => {
    if (!open) {
      setTitle('')
      setSlug('')
      setSlugTouched(false)
      setError(null)
      setSubmitting(false)
      setLibraryCount(null)
    } else {
      // Fetch current count to show cap status / disable submit defensively.
      fetchMyLibraries()
        .then((list) => setLibraryCount(list.length))
        .catch(() => setLibraryCount(null))
    }
  }, [open])

  // Auto-derive slug from title until user manually types in slug field.
  useEffect(() => {
    if (slugTouched) return
    setSlug(slugify(title))
  }, [title, slugTouched])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('도서관 이름을 입력해주세요.')
      return
    }
    setSubmitting(true)
    try {
      await createLibrary({
        title: title.trim(),
        slug: slug.trim() || undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(extractApiErrorMessage(err, '도서관 생성 실패'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="새 도서관 만들기"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {atCap ? '닫기' : '취소'}
          </Button>
          {!atCap && (
            <Button type="submit" form="create-library-form" disabled={submitting}>
              {submitting ? '생성 중...' : '만들기'}
            </Button>
          )}
        </>
      }
    >
      {atCap ? (
        <div className="space-y-3">
          <p className="text-(--color-ink) leading-relaxed">
            도서관은 한 사람당 <strong className="text-(--color-ink-strong)">{MAX_LIBRARIES_PER_USER}개</strong>까지 만들 수 있어요.
            현재 <strong className="text-(--color-ink-strong)">{libraryCount}개</strong>를 사용 중입니다.
          </p>
          <p className="text-sm text-(--color-ink-muted) leading-relaxed">
            새 도서관을 만들려면 기존 도서관 중 하나를 정리하거나 비워주세요.
            (책은 창고로 옮겨두면 잃어버리지 않습니다.)
          </p>
        </div>
      ) : (
        <form id="create-library-form" onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="도서관 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 일 자료, 취미 컬렉션"
            autoFocus
            maxLength={128}
            error={error ?? undefined}
          />
          <TextInput
            label="공유 URL slug (선택)"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setSlugTouched(true)
            }}
            placeholder="auto-generated"
            maxLength={64}
            hint={
              slug
                ? `공유 URL: /u/{username}/${slug}`
                : '도서관 이름에서 자동 생성됩니다 (직접 입력해도 됨)'
            }
          />
          <div className="text-xs text-(--color-ink-muted) bg-(--color-surface-sunken) rounded-(--radius-xs) px-3 py-2 leading-relaxed space-y-1">
            <p>
              한 도서관에는 책장을 최대 <strong className="text-(--color-ink-strong)">8개</strong>까지 둘 수 있습니다.
            </p>
            <p>
              도서관은 사용자당 <strong className="text-(--color-ink-strong)">{MAX_LIBRARIES_PER_USER}개</strong>까지 만들 수 있습니다
              {libraryCount !== null && (
                <span className="text-(--color-ink-faint)"> (현재 {libraryCount} / {MAX_LIBRARIES_PER_USER})</span>
              )}.
            </p>
          </div>
        </form>
      )}
    </Modal>
  )
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
