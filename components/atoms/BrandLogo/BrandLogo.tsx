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
          {/* Dropping Coin with Glow */}
          <circle cx="24" cy="8" r="4.5" fill="#ffffff" />
          <circle cx="24" cy="8" r="2.8" stroke="#10b981" strokeWidth="0.8" fill="#ecfdf5" />
          <path d="M 24 5.8 V 10.2 M 22 7.2 H 26" stroke="#059669" strokeWidth="1" strokeLinecap="round" />

          {/* Coin Drop Motion Rays */}
          <path d="M 18 9 L 19 11 M 30 9 L 29 11" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />

          {/* Modern Piggy Bank Body */}
          <path
            d="M 21 15 C 14.5 15 9.5 19.5 8 25 C 7 28.5 7.8 32.5 10.5 35.5 L 10.5 39 C 10.5 40.1 11.4 41 12.5 41 C 13.6 41 14.5 40.1 14.5 39 L 14.5 37 C 17.5 37.8 21.5 37.8 24.5 37 L 24.5 39 C 24.5 40.1 25.4 41 26.5 41 C 27.6 41 28.5 40.1 28.5 39 L 28.5 35 C 31 33.5 32.8 31 33.8 28.5 C 35.2 28.8 37.2 28.8 38.8 27.6 C 40 26.6 40.8 24.8 40.8 22.5 C 40.8 20.5 39.8 19.2 38.2 18.2 C 37.2 15.5 34.8 14 31.5 13.6 L 32.5 9.8 C 32.8 8.8 32.2 7.8 31.2 7.5 C 30.2 7.2 29.2 7.8 28.9 8.8 L 27.8 13.2 C 25.5 13 23 13 21 15 Z"
            fill="#ffffff"
          />

          {/* Coin Slot Cutout */}
          <rect x="20" y="14" width="7" height="1.8" rx="0.9" fill="#047857" />

          {/* Ear Fold Cutout */}
          <path d="M 29 14.5 C 30.5 16.5 32.5 17.8 34.5 17.8" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />

          {/* Sleek Eye Dot */}
          <circle cx="33.5" cy="22" r="1.3" fill="#047857" />

          {/* Snout Nostril */}
          <circle cx="38.5" cy="23.5" r="1" fill="#047857" />

          {/* Tail Curl */}
          <path d="M 8 27 C 5.5 27 4.2 25 5 23 C 5.8 21.5 7.5 22 8 23.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
