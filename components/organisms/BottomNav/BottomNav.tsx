'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Compass,
  Target,
  ReceiptText,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Beranda',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Jatah & AI',
      href: '/daily',
      icon: <Compass className="w-5 h-5" />,
    },
    {
      label: 'Celengan',
      href: '/savings',
      icon: <Target className="w-5 h-5" />,
    },
    {
      label: 'Transaksi',
      href: '/transactions',
      icon: <ReceiptText className="w-5 h-5" />,
    },
    {
      label: 'Profil',
      href: '/profile',
      icon: <User className="w-5 h-5" />,
    },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#131620]/95 backdrop-blur-xl border-t border-[#2d3348] px-2 py-2 shadow-2xl safe-area-pb">
      <nav className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 rounded-2xl transition-all duration-150 relative min-w-[54px]',
                isActive
                  ? 'text-green-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {/* Active glow indicator */}
              {isActive && (
                <span className="absolute -top-2 w-7 h-1 bg-green-500 rounded-full shadow-[0_0_12px_#22c55e]" />
              )}

              <div
                className={cn(
                  'p-1 rounded-xl transition-all',
                  isActive ? 'bg-green-500/15' : 'bg-transparent'
                )}
              >
                {item.icon}
              </div>

              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
