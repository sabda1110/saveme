import React from 'react'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils/cn'

export interface SectionHeaderProps {
  badgeText?: string
  badgeVariant?: 'brand' | 'income' | 'expense' | 'neutral' | 'warning' | 'purple'
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeader({
  badgeText,
  badgeVariant = 'brand',
  title,
  subtitle,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col mb-12 sm:mb-16',
        align === 'center' ? 'items-center text-center max-w-2xl mx-auto' : 'items-start text-left',
        className
      )}
    >
      {badgeText && (
        <div className="mb-4">
          <Badge variant={badgeVariant} dot size="md">
            {badgeText}
          </Badge>
        </div>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
