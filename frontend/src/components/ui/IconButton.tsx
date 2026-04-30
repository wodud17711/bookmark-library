import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className = '', children, ...rest },
  ref,
) {
  const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center',
        'rounded-(--radius-sm)',
        'text-(--color-ink-muted)',
        'hover:bg-(--color-surface-sunken) hover:text-(--color-ink)',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-walnut-300)',
        sizeClass,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
})
