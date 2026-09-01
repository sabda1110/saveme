import React from 'react'
import Link from 'next/link'
import { WalletCards } from 'lucide-react'
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
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
  }

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 group cursor-pointer select-none', className)}>
      <div
        className={cn(
          'relative rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200 overflow-hidden',
          iconSizes[size]
        )}
      >
        <svg viewBox="0 0 128 128" width="100%" height="100%" className="w-full h-full">
          <defs>
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" />
              <stop offset="100%" stop-color="#022c22" />
            </linearGradient>
            <linearGradient id="logoEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#34d399" />
              <stop offset="100%" stop-color="#059669" />
            </linearGradient>
          </defs>

          <rect
            x="4"
            y="4"
            width="120"
            height="120"
            rx="30"
            fill="url(#logoBg)"
            stroke="#10b981"
            strokeWidth="3"
            strokeOpacity="0.4"
          />

          <path
            d="M 82 36 C 82 36, 58 34, 49 42 C 40 50, 40 60, 52 65 L 72 74 C 86 80, 86 94, 73 101 C 61 108, 42 103, 42 103"
            fill="none"
            stroke="url(#logoEmerald)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle cx="64" cy="64" r="6" fill="#ecfdf5" />

          <path
            d="M 78 36 L 90 36 L 90 48"
            fill="none"
            stroke="#34d399"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex items-baseline tracking-tight">
        <span className={cn('font-black text-slate-900 dark:text-white', textSizes[size])}>
          Save<span className="text-emerald-500 font-extrabold">Me</span>
        </span>
      </div>
    </div>
  )

  if (withLink) {
    return <Link href="/">{content}</Link>
  }

  return content
}
