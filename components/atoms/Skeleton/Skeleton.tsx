'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rounded' | 'card'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'rounded',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  const customStyle: React.CSSProperties = {
    ...style,
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200/80 dark:bg-white/6',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded-md h-3.5 w-full',
        variant === 'rounded' && 'rounded-xl',
        variant === 'card' && 'rounded-3xl border border-slate-200/60 dark:border-white/5',
        className
      )}
      style={customStyle}
      aria-hidden="true"
      {...props}
    />
  )
}
