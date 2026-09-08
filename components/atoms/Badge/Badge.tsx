import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'income' | 'expense' | 'neutral' | 'brand' | 'warning' | 'purple' | 'info' | 'cyan'
  size?: 'xs' | 'sm' | 'md'
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
    xs: 'text-[10px] px-2 py-0.5 rounded-full gap-1 font-semibold leading-normal',
    sm: 'text-xs px-2.5 py-0.5 rounded-full gap-1.5 font-medium leading-normal',
    md: 'text-sm px-3 py-1 rounded-full gap-2 font-medium leading-normal',
  }

  const variantStyles = {
    income: 'bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30',
    expense: 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30',
    neutral: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60',
    brand: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30',
    purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
    info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30',
  }

  const dotColors = {
    income: 'bg-green-500 dark:bg-green-400',
    expense: 'bg-red-500 dark:bg-red-400',
    neutral: 'bg-slate-500 dark:bg-slate-400',
    brand: 'bg-emerald-500 dark:bg-emerald-400 animate-pulse',
    warning: 'bg-amber-500 dark:bg-amber-400',
    purple: 'bg-purple-500 dark:bg-purple-400',
    info: 'bg-blue-500 dark:bg-blue-400',
    cyan: 'bg-cyan-500 dark:bg-cyan-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap shrink-0 select-none transition-colors',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      {children}
    </span>
  )
}
