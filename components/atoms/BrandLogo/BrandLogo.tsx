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
    sm: 'w-6 h-6 p-1',
    md: 'w-8 h-8 p-1.5',
    lg: 'w-10 h-10 p-2',
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 group cursor-pointer', className)}>
      <div
        className={cn(
          'rounded-xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md shadow-green-500/20 group-hover:scale-105 transition-transform duration-200',
          iconSizes[size]
        )}
      >
        <WalletCards className="w-full h-full text-slate-950 stroke-[2.2]" />
      </div>
      <div className="flex items-baseline">
        <span className={cn('font-bold tracking-tight text-white', textSizes[size])}>
          Save<span className="text-green-400">Me</span>
        </span>
      </div>
    </div>
  )

  if (withLink) {
    return <Link href="/">{content}</Link>
  }

  return content
}
