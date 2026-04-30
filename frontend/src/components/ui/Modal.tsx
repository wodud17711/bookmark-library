import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  /** Maximum width preset. Defaults to 'md' (480px). */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="absolute inset-0 bg-(--color-surface-overlay) backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={[
          'relative w-full',
          SIZE[size],
          'bg-(--color-surface-raised)',
          'rounded-(--radius-lg)',
          'shadow-(--shadow-modal)',
          'border border-(--color-line)',
          'max-h-[85vh] flex flex-col',
        ].join(' ')}
      >
        {title && (
          <header className="flex items-center justify-between px-6 py-4 border-b border-(--color-line-soft)">
            <h2 id="modal-title" className="text-lg font-semibold text-(--color-ink-strong)">
              {title}
            </h2>
            <IconButton label="닫기" onClick={onClose} size="sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
          </header>
        )}
        <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="px-6 py-4 border-t border-(--color-line-soft) flex justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
