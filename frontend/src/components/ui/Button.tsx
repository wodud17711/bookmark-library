import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-(--color-walnut-500) text-(--color-surface-raised) ' +
    'hover:bg-(--color-walnut-700) ' +
    'shadow-(--shadow-sm) hover:shadow-(--shadow-md)',
  secondary:
    'bg-(--color-surface-raised) text-(--color-ink) border border-(--color-line) ' +
    'hover:bg-(--color-surface-sunken) hover:border-(--color-walnut-300)',
  ghost:
    'bg-transparent text-(--color-ink) ' +
    'hover:bg-(--color-surface-sunken)',
  danger:
    'bg-(--color-danger) text-white ' +
    'hover:opacity-90 ' +
    'shadow-(--shadow-sm)',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-(--radius-sm)',
  md: 'px-5 py-2.5 text-[15px] rounded-(--radius-md)',
  lg: 'px-7 py-3.5 text-base rounded-(--radius-md)',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-medium tracking-tight',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-walnut-300) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface-base)',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
})
