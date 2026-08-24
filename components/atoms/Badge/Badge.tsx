import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'income' | 'expense' | 'neutral' | 'brand' | 'warning' | 'purple'
  size?: 'sm' | 'md'
  icon?: React.ReactNode
  dot?: boolean
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  icon,
  dot,
  children,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full gap-1.5 font-medium',
    md: 'text-sm px-3 py-1 rounded-full gap-2 font-medium',
  }

  const variantStyles = {
    income: 'bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30',
    expense: 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30',
    neutral: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60',
    brand: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30',
    purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
  }

  const dotColors = {
    income: 'bg-green-500 dark:bg-green-400',
    expense: 'bg-red-500 dark:bg-red-400',
    neutral: 'bg-slate-500 dark:bg-slate-400',
    brand: 'bg-emerald-500 dark:bg-emerald-400 animate-pulse',
    warning: 'bg-amber-500 dark:bg-amber-400',
    purple: 'bg-purple-500 dark:bg-purple-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {icon && <span>{icon}</span>}
      {children}
    </span>
  )
}
