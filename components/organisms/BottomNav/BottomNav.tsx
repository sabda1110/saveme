'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Compass,
  Wallet,
  Target,
  CreditCard,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils/cn'

export function BottomNav() {
  const pathname = usePathname()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Jatah',
      href: '/daily',
      icon: <Compass className="w-5 h-5" />,
    },
    {
      label: 'Kantong',
      href: '/wallets',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      label: 'Celengan',
      href: '/savings',
      icon: <Target className="w-5 h-5" />,
    },
    {
      label: 'Tagihan',
      href: '/bills',
      icon: <CreditCard className="w-5 h-5" />,
    },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131620]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#2d3348] px-2 py-2 shadow-lg dark:shadow-2xl safe-area-pb transition-colors">
      <nav className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const isLocked = Boolean(
            userProfile &&
              userProfile.hasCompletedOnboarding === false &&
              item.href !== '/dashboard'
          )

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault()
                  toast.warning(
                    'Silakan selesaikan panduan onboarding dan isi dompet terlebih dahulu!'
                  )
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 rounded-2xl transition-all duration-150 relative min-w-[54px]',
                isLocked
                  ? 'text-slate-400 dark:text-slate-600 opacity-60'
                  : isActive
                  ? 'text-green-600 dark:text-green-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              {/* Active glow indicator */}
              {isActive && (
                <span className="absolute -top-2 w-7 h-1 bg-green-500 rounded-full shadow-[0_0_12px_#22c55e]" />
              )}

              <div
                className={cn(
                  'p-1 rounded-xl transition-all relative',
                  isActive ? 'bg-green-500/15' : 'bg-transparent',
                  isLocked && 'opacity-60'
                )}
              >
                {item.icon}
                {isLocked && (
                  <span className="absolute -top-1 -right-1 bg-slate-200 dark:bg-slate-700 rounded-full p-0.5 shadow-xs">
                    <Lock className="w-2.5 h-2.5 text-slate-500 dark:text-slate-300" />
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
