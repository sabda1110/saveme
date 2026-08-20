'use client'

import React, { useState } from 'react'
import { CheckCircle2, Circle, X, Sparkles, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface GettingStartedWidgetProps {
  hasOnboardingCompleted: boolean
  hasTransactions: boolean
  hasSavingsRate: boolean
  onAddTransactionClick: () => void
}

export function GettingStartedWidget({
  hasOnboardingCompleted,
  hasTransactions,
  hasSavingsRate,
  onAddTransactionClick,
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
          className="text-xs text-green-400 hover:text-green-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
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

  // Automatically hide if user dismissed it OR if all 4 tasks are 100% completed
  if (isDismissed || completedCount === tasks.length) {
    return null
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#1a1d27] to-[#1e2333] border border-[#2d3348] shadow-xl relative overflow-hidden animate-in fade-in">
      {/* Background flare */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Dismiss */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Panduan Memulai SaveMe ({completedCount}/{tasks.length} Selesai)
            </h3>
            <p className="text-xs text-slate-400">
              Langkah awal menuju pengelolaan keuangan yang tertata dan bebas stres.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#21263a] transition-colors cursor-pointer"
          title="Tutup panduan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#21263a] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              'p-3 rounded-xl border flex items-start gap-3 transition-all',
              task.completed
                ? 'bg-green-500/5 border-green-500/20 text-slate-300'
                : 'bg-[#21263a]/40 border-[#2d3348] text-slate-400'
            )}
          >
            {task.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  'text-xs font-semibold',
                  task.completed ? 'text-slate-100 line-through opacity-80' : 'text-slate-200'
                )}
              >
                {task.title}
              </span>
              <span className="text-[11px] text-slate-500">{task.description}</span>
              {task.action && <div className="mt-1.5">{task.action}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
