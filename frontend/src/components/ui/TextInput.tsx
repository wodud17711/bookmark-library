import { type InputHTMLAttributes, forwardRef } from 'react'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, id, className = '', ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-(--color-ink-strong)"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          'w-full px-3.5 py-2.5 text-[15px]',
          'bg-(--color-surface-raised) text-(--color-ink-strong)',
          'border rounded-(--radius-sm)',
          error
            ? 'border-(--color-danger) focus:border-(--color-danger)'
            : 'border-(--color-line) focus:border-(--color-walnut-500)',
          'placeholder:text-(--color-ink-faint)',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-(--color-walnut-300)/40',
          'disabled:bg-(--color-surface-sunken) disabled:cursor-not-allowed',
          className,
        ].join(' ')}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-(--color-danger)">{error}</p>
      ) : hint ? (
        <p className="text-xs text-(--color-ink-muted)">{hint}</p>
      ) : null}
    </div>
  )
})
