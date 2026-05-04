import { useEffect, useState } from 'react'
import { Button, Modal, Textarea } from '../ui'
import { extractApiErrorMessage } from '../../api/client'
import {
  REPORT_REASON_LABELS,
  submitReport,
  type ReportReason,
} from '../../api/reports'

const REASONS: ReportReason[] = ['ILLEGAL', 'COPYRIGHT', 'HARASSMENT', 'SPAM', 'OTHER']

const FORM_ID = 'report-form'

interface Props {
  open: boolean
  libraryId: number | null
  libraryTitle?: string
  onClose: () => void
}

/**
 * Visitor-facing report modal. Reachable from the public library page (header
 * "🚩 신고" button). Submits to {@code POST /api/reports}; the backend stores
 * the row, the operator triages downstream.
 *
 * Anonymous submissions are accepted, so this modal works even when the
 * visitor isn't signed into the platform.
 */
export function ReportModal({ open, libraryId, libraryTitle, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason>('ILLEGAL')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Reset every time the modal reopens so previous state doesn't leak.
  useEffect(() => {
    if (open) {
      setReason('ILLEGAL')
      setDetails('')
      setError(null)
      setDone(false)
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (libraryId == null || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await submitReport({
        libraryId,
        reason,
        details: details.trim() || undefined,
      })
      setDone(true)
    } catch (err) {
      setError(extractApiErrorMessage(err, '신고 접수에 실패했어요. 잠시 후 다시 시도해주세요.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="신고가 접수되었습니다"
        footer={<Button onClick={onClose}>닫기</Button>}
      >
        <p className="text-sm text-(--color-ink) leading-relaxed">
          소중한 신고 감사합니다. 운영자가 검토 후 24~48시간 내에 처리할 예정이며,
          위반이 확인되는 경우 해당 도서관은 비공개 또는 삭제될 수 있습니다.
        </p>
        <p className="mt-3 text-xs text-(--color-ink-muted)">
          긴급한 사안이거나 추가 자료가 있다면 jaeyoung17711@gmail.com 으로 메일을 보내주세요.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={libraryTitle ? `${libraryTitle} 도서관 신고` : '도서관 신고'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? '접수 중…' : '신고 제출'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-sm font-medium text-(--color-ink-strong) mb-3">신고 사유</p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex items-start gap-3 px-3 py-2 rounded-(--radius-sm) border border-(--color-line) hover:bg-(--color-surface-sunken) cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="mt-1 accent-(--color-walnut-500)"
                />
                <span className="text-sm text-(--color-ink)">{REPORT_REASON_LABELS[r]}</span>
              </label>
            ))}
          </div>
        </div>

        <Textarea
          label="자세한 내용 (선택)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="문제가 되는 부분이나 추가 정보를 알려주세요. (선택)"
        />

        <p className="text-xs text-(--color-ink-muted) leading-relaxed">
          허위/반복 신고는 기능 사용이 제한될 수 있습니다. 신고는 정보주체의 권리 침해 또는
          위법한 콘텐츠가 있을 때만 사용해주세요.
        </p>

        {error && (
          <p className="text-sm text-(--color-danger)">{error}</p>
        )}
      </form>
    </Modal>
  )
}
