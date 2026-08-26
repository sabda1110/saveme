'use client'

import React, { useState } from 'react'
import { CheckCircle2, Circle, X, Sparkles, PlusCircle, Bell } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface GettingStartedWidgetProps {
  hasOnboardingCompleted: boolean
  hasTransactions: boolean
  hasSavingsRate: boolean
  hasNotificationEnabled?: boolean
  onAddTransactionClick: () => void
  onEnableNotificationClick?: () => void
}

export function GettingStartedWidget({
  hasOnboardingCompleted,
  hasTransactions,
  hasSavingsRate,
  hasNotificationEnabled = false,
  onAddTransactionClick,
  onEnableNotificationClick,
}: GettingStartedWidgetProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('saveme_getting_started_dismissed') === 'true'
      } catch {
        return false
      }
    }
    return false
  })

  const tasks = [
    {
      id: 1,
      title: 'Buat & Verifikasi Akun SaveMe',
      description: 'Akun personal finance aman dan privat',
      completed: true,
    },
    {
      id: 2,
      title: 'Atur Saldo Awal & Pemasukan Bulanan',
      description: 'Fondasi batas aman belanja dan rasio tabungan',
      completed: hasOnboardingCompleted,
    },
    {
      id: 3,
      title: 'Catat Transaksi Pertamamu Hari Ini',
      description: 'Mulai kebiasaan baik dengan mencatat pengeluaran kecil',
      completed: hasTransactions,
      action: !hasTransactions ? (
        <button
          type="button"
          onClick={onAddTransactionClick}
          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Catat Sekarang
        </button>
      ) : null,
    },
    {
      id: 4,
      title: 'Capai Rasio Tabungan Sehat (Target > 20%)',
      description: 'Sisihkan sebagian uang untuk dana darurat & masa depan',
      completed: hasSavingsRate,
    },
    {
      id: 5,
      title: 'Aktifkan Pengingat Jatah Belanja Pagi (07:00)',
      description: 'Briefing batas aman belanja setiap pagi via push notification',
      completed: hasNotificationEnabled,
      action: !hasNotificationEnabled && onEnableNotificationClick ? (
        <button
          type="button"
          onClick={onEnableNotificationClick}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5" /> Aktifkan Sekarang
        </button>
      ) : null,
    },
  ]

  const completedCount = tasks.filter((t) => t.completed).length
  const progressPercent = Math.round((completedCount / tasks.length) * 100)

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      localStorage.setItem('saveme_getting_started_dismissed', 'true')
    } catch {
      // ignore
    }
  }

  // Automatically hide if user dismissed it OR if all tasks are 100% completed
  if (isDismissed || completedCount === tasks.length) {
    return null
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-[#1a1d27] dark:to-[#1e2333] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl relative overflow-hidden animate-in fade-in">
      {/* Background flare */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Dismiss */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Panduan Memulai SaveMe ({completedCount}/{tasks.length} Selesai)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Langkah awal menuju pengelolaan keuangan yang tertata dan bebas stres.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
          title="Tutup panduan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 dark:bg-[#21263a] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              'p-3.5 rounded-xl border transition-all flex items-start gap-3',
              task.completed
                ? 'bg-green-500/5 border-green-500/20 text-slate-700 dark:text-slate-300'
                : 'bg-slate-50 dark:bg-[#21263a]/40 border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400'
            )}
          >
            <div className="mt-0.5 shrink-0">
              {task.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-400 dark:text-slate-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-xs font-semibold block',
                    task.completed
                      ? 'line-through text-slate-500 dark:text-slate-400'
                      : 'text-slate-900 dark:text-slate-200'
                  )}
                >
                  {task.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {task.description}
              </p>
              {task.action && <div className="mt-1.5">{task.action}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
