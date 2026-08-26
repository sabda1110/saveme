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
  Sparkles,
  Zap,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function Sidebar() {
  const pathname = usePathname()
  const { user, userProfile, isAdmin, isSuperAdmin, logout } = useAuth()

  const mainNavItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Jatah Harian & AI',
      href: '/daily',
      icon: <Compass className="w-5 h-5" />,
      badge: 'AI',
    },
    {
      label: 'Alokasi Gaji & Uang Saku',
      href: '/payroll',
      icon: <DollarSign className="w-5 h-5" />,
      badge: 'Hub',
    },
    {
      label: 'Kantong & Rekening',
      href: '/wallets',
      icon: <WalletIcon className="w-5 h-5" />,
    },
    {
      label: 'Template Cepat',
      href: '/templates',
      icon: <Zap className="w-5 h-5" />,
    },
    {
      label: 'Celengan Impian',
      href: '/savings',
      icon: <Target className="w-5 h-5" />,
    },
    {
      label: 'Daftar Transaksi',
      href: '/transactions',
      icon: <ReceiptText className="w-5 h-5" />,
    },
    {
      label: 'Cicilan & Tagihan',
      href: '/bills',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      label: 'Laporan & Analitik',
      href: '/reports',
      icon: <PieChart className="w-5 h-5" />,
    },
    {
      label: 'Profil Akun',
      href: '/profile',
      icon: <User className="w-5 h-5" />,
    },
  ]

  const adminNavItems = [
    {
      label: 'Admin Console',
      href: '/admin',
      icon: <ShieldAlert className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
      badge: isSuperAdmin ? 'Super' : 'Admin',
    },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-[#131620] border-r border-slate-200 dark:border-[#2d3348] h-screen p-4 flex flex-col justify-between hidden lg:flex shrink-0 transition-colors">
      <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 shrink-0">
          <BrandLogo size="md" />
          <Badge
            variant={isSuperAdmin ? 'brand' : isAdmin ? 'warning' : 'neutral'}
            size="sm"
          >
            {userProfile?.role || 'USER'}
          </Badge>
        </div>

        {/* Navigation Items (Smooth Scrollable on Small Viewports) */}
        <nav className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1 shrink-0">
            Menu Utama
          </span>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 shrink-0',
                  isActive
                    ? 'bg-green-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/25 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#21263a]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-colors',
                      isActive
                        ? 'bg-green-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-[#21263a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2d3348]'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Admin Navigation (Only visible for ADMIN & SUPER_ADMIN) */}
          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]/60 flex flex-col gap-1 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400/80 px-3 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Administrasi
              </span>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 shrink-0',
                      isActive
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30'
                        : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-200 hover:bg-slate-100 dark:hover:bg-[#21263a]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <Badge variant="warning" size="sm">
                      {item.badge}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Profile, Theme Toggle & Logout (Pinned to Bottom) */}
      <div className="pt-3 border-t border-slate-200 dark:border-[#2d3348] flex flex-col gap-2 shrink-0 mt-auto">
        {/* Theme Toggle Button */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tampilan:
          </span>
          <ThemeToggle size="sm" showLabel />
        </div>

        {/* User Profile Mini Bar */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348]">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-700 dark:text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
              {userProfile?.name?.charAt(0).toUpperCase() ||
                user?.email?.charAt(0).toUpperCase() ||
                'U'}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {userProfile?.name || 'Pengguna'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.email}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-[#21263a] rounded-lg transition-colors cursor-pointer shrink-0"
            title="Keluar dari Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
