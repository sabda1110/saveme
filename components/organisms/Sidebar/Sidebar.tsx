'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import { Badge } from '@/components/atoms/Badge'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Compass,
  Target,
  Wallet as WalletIcon,
  ReceiptText,
  CreditCard,
  PieChart,
  User,
  ShieldAlert,
  LogOut,
  Zap,
  DollarSign,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, userProfile, isAdmin, isSuperAdmin, logout } = useAuth()

  const navGroups: NavGroup[] = [
    {
      title: 'Ringkasan',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          label: 'Jatah Harian',
          href: '/daily',
          icon: <Compass className="w-4 h-4" />,
        },
        {
          label: 'Laporan & Analisis',
          href: '/reports',
          icon: <PieChart className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Perencanaan & Tabungan',
      items: [
        {
          label: 'Alokasi Gaji & Payroll',
          href: '/payroll',
          icon: <DollarSign className="w-4 h-4" />,
        },
        {
          label: 'Kantong & Rekening',
          href: '/wallets',
          icon: <WalletIcon className="w-4 h-4" />,
        },
        {
          label: 'Celengan Impian',
          href: '/savings',
          icon: <Target className="w-4 h-4" />,
        },
        {
          label: 'Cicilan & Tagihan',
          href: '/bills',
          icon: <CreditCard className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Aktivitas & Alat',
      items: [
        {
          label: 'Daftar Transaksi',
          href: '/transactions',
          icon: <ReceiptText className="w-4 h-4" />,
        },
        {
          label: 'Template Cepat',
          href: '/templates',
          icon: <Zap className="w-4 h-4" />,
        },
      ],
    },
  ]

  const adminGroup: NavGroup = {
    title: 'Sistem',
    items: [
      {
        label: 'Admin Console',
        href: '/admin',
        icon: <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      },
    ],
  }

  return (
    <aside className="w-64 bg-white dark:bg-[#0e1118] border-r border-slate-200 dark:border-white/8 h-screen flex flex-col justify-between hidden lg:flex shrink-0 transition-colors">
      {/* 1. Top Brand Header */}
      <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-white/6">
        <BrandLogo size="md" />
        <Badge
          variant={isSuperAdmin ? 'brand' : isAdmin ? 'warning' : 'neutral'}
          size="sm"
        >
          {isSuperAdmin ? 'Super' : isAdmin ? 'Admin' : 'Personal'}
        </Badge>
      </div>

      {/* 2. Structured Semantic Navigation */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              {group.title}
            </h3>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'transition-colors',
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                        )}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Admin Navigation (Only visible for Admins) */}
        {isAdmin && (
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/6">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {adminGroup.title}
            </h3>
            <div className="space-y-0.5 pt-1">
              {adminGroup.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold border border-amber-200/80 dark:border-amber-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-100/80 dark:hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <Badge variant="warning" size="sm">
                      {isSuperAdmin ? 'Super' : 'Admin'}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Profile Bar & Theme Switcher (Bespoke Footer) */}
      <div className="p-3 border-t border-slate-100 dark:border-white/6 bg-slate-50/50 dark:bg-white/1 space-y-2.5">
        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/8 shadow-2xs">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity flex-1"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center font-bold text-xs shrink-0">
              {userProfile?.name?.charAt(0).toUpperCase() ||
                user?.email?.charAt(0).toUpperCase() ||
                'U'}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                {userProfile?.name || 'Pengguna'}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
            title="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Switcher */}
        <div className="flex items-center justify-between px-2 pt-0.5">
          <span className="text-[11px] font-medium text-slate-400">Mode Tema</span>
          <ThemeToggle size="sm" />
        </div>
      </div>
    </aside>
  )
}
