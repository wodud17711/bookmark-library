import { type HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'raised'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'flat', padding = 'md', className = '', children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={[
        'bg-(--color-surface-raised)',
        'border border-(--color-line)',
        'rounded-(--radius-lg)',
        variant === 'raised' ? 'shadow-(--shadow-md)' : '',
        PADDING[padding],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
})
