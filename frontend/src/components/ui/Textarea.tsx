import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  /** Show character count `current / max`. Requires `maxLength`. */
  showCount?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, showCount, id, className = '', value, maxLength, ...rest },
  ref,
) {
  const textareaId = id ?? rest.name
  const currentLength = typeof value === 'string' ? value.length : 0
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-(--color-ink-strong)"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        value={value}
        maxLength={maxLength}
        className={[
          'w-full px-3.5 py-2.5 text-[15px] leading-relaxed',
          'bg-(--color-surface-raised) text-(--color-ink-strong)',
          'border rounded-(--radius-sm)',
          error
            ? 'border-(--color-danger) focus:border-(--color-danger)'
            : 'border-(--color-line) focus:border-(--color-walnut-500)',
          'placeholder:text-(--color-ink-faint)',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-(--color-walnut-300)/40',
          'disabled:bg-(--color-surface-sunken) disabled:cursor-not-allowed',
          'resize-y min-h-[80px]',
          className,
        ].join(' ')}
        {...rest}
      />
      <div className="flex items-baseline justify-between gap-2">
        {error ? (
          <p className="text-xs text-(--color-danger)">{error}</p>
        ) : hint ? (
          <p className="text-xs text-(--color-ink-muted)">{hint}</p>
        ) : (
          <span />
        )}
        {showCount && maxLength && (
          <p className="text-xs text-(--color-ink-faint) tabular-nums shrink-0">
            {currentLength} / {maxLength}
          </p>
        )}
      </div>
    </div>
  )
})
