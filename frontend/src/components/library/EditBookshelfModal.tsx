import { useEffect, useState } from 'react'
import { Button, Modal, TextInput } from '../ui'
import { deleteBookshelf, updateBookshelf, type Bookshelf, type BookshelfZone } from '../../api/library'
import { extractApiErrorMessage } from '../../api/client'

interface Props {
  open: boolean
  bookshelf: Bookshelf | null
  onClose: () => void
  onChanged: () => void
}

export function EditBookshelfModal({ open, bookshelf, onClose, onChanged }: Props) {
  const [title, setTitle] = useState('')
  const [zone, setZone] = useState<BookshelfZone>('PUBLIC')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (bookshelf) {
      setTitle(bookshelf.title)
      setZone(bookshelf.zone)
      setError(null)
      setConfirmingDelete(false)
      setSubmitting(false) // guard against leftover state after a previous delete/save
    }
  }, [bookshelf])

  if (!bookshelf) return null

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) {
      setError('책장 이름은 비울 수 없습니다.')
      return
    }
    setSubmitting(true)
    try {
      await updateBookshelf(bookshelf.id, {
        title: title.trim(),
        zone,
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
      await deleteBookshelf(bookshelf.id)
      onChanged()
      onClose()
    } catch (err) {
      setError(extractApiErrorMessage(err, '삭제 실패'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="책장 편집"
      footer={
        confirmingDelete ? (
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={submitting}>
              취소
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={submitting}>
              {submitting ? '삭제 중...' : `${bookshelf.books.length}권 모두 삭제`}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)} disabled={submitting}>
              책장 삭제
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" form="edit-shelf-form" disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </Button>
          </>
        )
      }
    >
      {confirmingDelete ? (
        <div className="text-(--color-ink) leading-relaxed">
          <p className="mb-2 font-medium text-(--color-ink-strong)">정말 삭제할까요?</p>
          <p className="text-sm text-(--color-ink-muted)">
            <strong className="text-(--color-ink-strong)">"{bookshelf.title}"</strong>{' '}
            책장과 그 안의 책 {bookshelf.books.length}권이 모두 사라집니다. 되돌릴 수 없습니다.
          </p>
        </div>
      ) : (
        <form id="edit-shelf-form" onSubmit={handleSave} className="space-y-5">
          <TextInput
            label="책장 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={128}
            error={error ?? undefined}
          />

          <div>
            <p className="text-sm font-medium text-(--color-ink-strong) mb-2">위치</p>
            <div className="grid grid-cols-2 gap-2">
              <ZoneOption
                selected={zone === 'PUBLIC'}
                onClick={() => setZone('PUBLIC')}
                title="일반 책장"
                description="공유 시 보입니다"
              />
              <ZoneOption
                selected={zone === 'PRIVATE'}
                onClick={() => setZone('PRIVATE')}
                title="프라이빗 룸"
                description="나만 볼 수 있습니다"
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}

function ZoneOption({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left p-3 rounded-(--radius-sm) border transition-all',
        selected
          ? 'border-(--color-walnut-500) bg-(--color-walnut-50)'
          : 'border-(--color-line) hover:border-(--color-walnut-300)',
      ].join(' ')}
    >
      <p className="font-medium text-(--color-ink-strong) text-sm">{title}</p>
      <p className="text-xs text-(--color-ink-muted) mt-0.5">{description}</p>
    </button>
  )
}
