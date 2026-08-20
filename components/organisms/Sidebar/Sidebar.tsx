'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import { Badge } from '@/components/atoms/Badge'
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
      icon: <Compass className="w-5 h-5 text-emerald-400" />,
      badge: 'AI',
    },
    {
      label: 'Kantong & Rekening',
      href: '/wallets',
      icon: <WalletIcon className="w-5 h-5 text-blue-400" />,
      badge: 'Baru',
    },
    {
      label: 'Celengan Impian',
      href: '/savings',
      icon: <Target className="w-5 h-5 text-green-400" />,
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
      icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
      badge: isSuperAdmin ? 'Super' : 'Admin',
    },
  ]

  return (
    <aside className="w-64 bg-[#131620] border-r border-[#2d3348] flex flex-col justify-between h-screen sticky top-0 shrink-0 p-5 select-none overflow-y-auto">
      {/* Top Header & Logo */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <BrandLogo size="md" />
        </div>

        {/* Role & Status Pill */}
        <div className="p-3 rounded-xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">Hak Akses:</span>
          </div>
          <Badge
            variant={isSuperAdmin ? 'brand' : isAdmin ? 'warning' : 'neutral'}
            size="sm"
          >
            {userProfile?.role || 'USER'}
          </Badge>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">
            Menu Keuangan
          </span>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-green-500/15 text-green-400 font-semibold border border-green-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#21263a]'
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Admin Navigation (Only visible for ADMIN & SUPER_ADMIN) */}
          {isAdmin && (
            <div className="mt-4 pt-3 border-t border-[#2d3348]/60 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 px-3 mb-1 flex items-center gap-1">
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
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                        : 'text-slate-400 hover:text-amber-200 hover:bg-[#21263a]'
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

      {/* Bottom Profile & Logout */}
      <div className="pt-4 border-t border-[#2d3348] flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1a1d27] border border-[#2d3348]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 flex items-center justify-center text-xs font-bold shrink-0">
              {userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {userProfile?.name || 'Pengguna'}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Keluar dari Akun"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#21263a] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
