'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from '@/components/organisms/Sidebar'
import { BottomNav } from '@/components/organisms/BottomNav'
import { SingleTabGuard } from '@/components/organisms/SingleTabGuard'
import { NotificationPromptModal } from '@/components/organisms/NotificationPromptModal'
import { MorningBriefingAlarm } from '@/components/organisms/MorningBriefingAlarm/MorningBriefingAlarm'
import { PinLockScreen } from '@/components/organisms/PinLockScreen/PinLockScreen'
import { setupForegroundMessageListener } from '@/lib/firebase/messaging'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { AppTemplate } from '@/components/templates/AppTemplate'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import { Badge } from '@/components/atoms/Badge'
import {
  Menu,
  X,
  LogOut,
  ShieldAlert,
  Sparkles,
  LayoutDashboard,
  Compass,
  Target,
  Wallet as WalletIcon,
  ReceiptText,
  CreditCard,
  PieChart,
  User,
  Zap,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userProfile, isAdmin, isSuperAdmin, loading, logout } = useAuth()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Setup foreground FCM notification listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    setupForegroundMessageListener((payload) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(payload.title || 'SaveMe - Pengingat Harian', {
            body: payload.body || '',
            icon: '/globe.svg',
            data: { url: payload.url || '/daily' },
          })
        } catch {
          // ignore
        }
      }
    }).then((unsub) => {
      unsubscribe = unsub
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Memuat sesi SaveMe...</span>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const drawerNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Jatah Harian & AI', href: '/daily', icon: <Compass className="w-5 h-5" /> },
    { label: 'Alokasi Gaji & Uang Saku', href: '/payroll', icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Kantong & Rekening', href: '/wallets', icon: <WalletIcon className="w-5 h-5" /> },
    { label: 'Template Cepat', href: '/templates', icon: <Zap className="w-5 h-5" /> },
    { label: 'Celengan Impian', href: '/savings', icon: <Target className="w-5 h-5" /> },
    { label: 'Daftar Transaksi', href: '/transactions', icon: <ReceiptText className="w-5 h-5" /> },
    { label: 'Cicilan & Tagihan', href: '/bills', icon: <CreditCard className="w-5 h-5" /> },
    { label: 'Laporan & Analitik', href: '/reports', icon: <PieChart className="w-5 h-5" /> },
    { label: 'Profil Akun', href: '/profile', icon: <User className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] flex flex-col transition-colors">
      {/* Mobile Topbar */}
      <header className="lg:hidden bg-white/95 dark:bg-[#131620]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#2d3348] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm dark:shadow-md transition-colors">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <Badge
            variant={isSuperAdmin ? 'brand' : isAdmin ? 'warning' : 'neutral'}
            size="sm"
          >
            {userProfile?.role || 'USER'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] transition-colors cursor-pointer"
            aria-label="Buka Menu Navigasi"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-out Drawer / Overlay */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-[#131620] border-r border-slate-200 dark:border-[#2d3348] h-full flex flex-col justify-between p-5 z-10 shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2d3348]">
                <BrandLogo size="md" />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User badge preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                    {userProfile?.name || 'Pengguna'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                    {user.email}
                  </span>
                </div>
                <Badge
                  variant={isSuperAdmin ? 'brand' : isAdmin ? 'warning' : 'neutral'}
                  size="sm"
                >
                  {userProfile?.role || 'USER'}
                </Badge>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1">
                  Menu Utama
                </span>
                {drawerNavItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-green-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/25 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]'
                      )}
                    >
                      <span className={cn('shrink-0 transition-colors', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}

                {/* Admin Link if Admin */}
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#2d3348] flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-3 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Administrasi
                    </span>
                    <Link
                      href="/admin"
                      onClick={() => setMobileDrawerOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        pathname === '/admin'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-200 hover:bg-slate-100 dark:hover:bg-[#21263a]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                        <span>Admin Console</span>
                      </div>
                      <Badge variant="warning" size="sm">
                        {isSuperAdmin ? 'Super' : 'Admin'}
                      </Badge>
                    </Link>
                  </div>
                )}
              </nav>
            </div>

            {/* Bottom Section: Theme Toggle + Logout button */}
            <div className="flex flex-col gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Tema Tampilan:
                </span>
                <ThemeToggle size="sm" showLabel />
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        <AppTemplate sidebar={<Sidebar />}>
          <div className="pb-20 lg:pb-0">{children}</div>
        </AppTemplate>
      </div>

      {/* Single-Tab Active Concurrency Guard */}
      <SingleTabGuard />

      {/* Security PIN Lock Screen */}
      <PinLockScreen />

      {/* Smart Morning In-App Alarm Trigger */}
      <MorningBriefingAlarm />

      {/* Notification Prompt Modal */}
      <NotificationPromptModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
