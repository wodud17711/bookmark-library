import { useState } from 'react'
import { Button, Modal, TextInput } from '../ui'
import { createBookshelf, type BookshelfZone } from '../../api/library'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddBookshelfModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [zone, setZone] = useState<BookshelfZone>('PUBLIC')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTitle('')
    setZone('PUBLIC')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('책장 이름을 입력해주세요.')
      return
    }
    setSubmitting(true)
    try {
      await createBookshelf({ title: title.trim(), zone })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '책장 추가에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="새 책장 추가"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button type="submit" form="add-bookshelf-form" disabled={submitting}>
            {submitting ? '추가 중...' : '추가하기'}
          </Button>
        </>
      }
    >
      <form id="add-bookshelf-form" onSubmit={handleSubmit} className="space-y-5">
        <TextInput
          label="책장 이름"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 프론트엔드 자료"
          autoFocus
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
