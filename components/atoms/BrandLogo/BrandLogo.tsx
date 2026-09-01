'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

export interface BrandLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  withLink?: boolean
}

export function BrandLogo({
  className,
  size = 'md',
  withLink = true,
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7 rounded-lg p-1.5',
    md: 'w-9 h-9 rounded-xl p-2',
    lg: 'w-11 h-11 rounded-2xl p-2.5',
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
  }

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 group cursor-pointer select-none', className)}>
      {/* Adaptive Vibrant Emerald Fintech Badge */}
      <div
        className={cn(
          'relative flex items-center justify-center shrink-0 bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 dark:from-emerald-500 dark:via-emerald-400 dark:to-teal-400 text-white shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/30 ring-1 ring-black/5 dark:ring-white/20 group-hover:scale-105 transition-all duration-200',
          iconSizes[size]
        )}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Geometric S-Vault Ribbon - Top Arch */}
          <path
            d="M 34 14 C 34 14, 21 11, 16 17 C 11 23, 13 29, 21 31 L 27 33 C 35 35, 37 41, 32 47 C 27 53, 14 50, 14 50"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="scale(0.8) translate(6, -2)"
          />
          {/* Central Savings Diamond Node */}
          <path
            d="M 24 19 L 28 24 L 24 29 L 20 24 Z"
            fill="white"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Upward Growth Arrow Tip */}
          <path
            d="M 28 10 L 35 10 L 35 17"
            stroke="white"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="scale(0.85) translate(4, 1)"
          />
        </svg>
      </div>

      {/* Logotype Text */}
      <div className="flex items-baseline tracking-tight">
        <span className={cn('font-black text-slate-900 dark:text-white', textSizes[size])}>
          Save<span className="text-emerald-600 dark:text-emerald-400 font-extrabold ml-0.5">Me</span>
        </span>
      </div>
    </div>
  )

  if (withLink) {
    return <Link href="/">{content}</Link>
  }

  return content
}
