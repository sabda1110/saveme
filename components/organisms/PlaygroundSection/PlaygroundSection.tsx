'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { PlaygroundSlider } from '@/components/molecules/PlaygroundSlider'
import { MockTransaction, type MockTransactionProps } from '@/components/molecules/MockTransaction'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import {
  Sparkles,
  TrendingUp,
  PiggyBank,
  HeartPulse,
  RotateCcw,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  Calendar,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface QuickAction {
  category: string
  icon: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
}

const QUICK_ACTIONS: QuickAction[] = [
  { category: 'Food', icon: '🍔', description: 'Makan Siang & Kopi', amount: 50000, type: 'EXPENSE' },
  { category: 'Transportation', icon: '🚗', description: 'Bensin & Tol', amount: 85000, type: 'EXPENSE' },
  { category: 'Shopping', icon: '🛍️', description: 'Belanja Bulanan', amount: 350000, type: 'EXPENSE' },
  { category: 'Bills', icon: '📄', description: 'Bayar WiFi & Listrik', amount: 450000, type: 'EXPENSE' },
  { category: 'Business', icon: '📈', description: 'Proyek Freelance', amount: 1800000, type: 'INCOME' },
  { category: 'Other', icon: '🎁', description: 'Hadiah / Cashback', amount: 150000, type: 'INCOME' },
]

export function PlaygroundSection() {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(8500000)
  const [monthlyFixedExpense, setMonthlyFixedExpense] = useState<number>(4200000)
  const [extraTransactions, setExtraTransactions] = useState<MockTransactionProps[]>([
    {
      category: 'Food',
      icon: '🍔',
      description: 'Makan Malam Keluarga',
      date: 'Hari ini, 19:30',
      amount: 125000,
      type: 'EXPENSE',
    },
    {
      category: 'Business',
      icon: '📈',
      description: 'Fee Desain Logo',
      date: 'Kemarin, 14:15',
      amount: 1200000,
      type: 'INCOME',
    },
  ])

  // Calculated dynamic statistics
  const dynamicExtraIncome = useMemo(() => {
    return extraTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)
  }, [extraTransactions])

  const dynamicExtraExpense = useMemo(() => {
    return extraTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0)
  }, [extraTransactions])

  const totalIncome = monthlyIncome + dynamicExtraIncome
  const totalExpense = monthlyFixedExpense + dynamicExtraExpense
  const netBalance = totalIncome - totalExpense
  const savingsRate = Math.max(0, Math.min(100, Math.round((netBalance / totalIncome) * 100)))
  const oneYearSavings = Math.max(0, netBalance * 12)

  // Health assessment
  const healthStatus = useMemo(() => {
    if (netBalance < 0) {
      return {
        label: 'Defisit / Bahaya',
        badgeColor: 'expense' as const,
        description: 'Pengeluaran melebihi pemasukan. Segera pangkas pos yang tidak esensial!',
        scoreColor: 'text-red-400',
        gaugeBg: 'bg-red-500',
        icon: '⚠️',
      }
    }
    if (savingsRate < 20) {
      return {
        label: 'Perlu Perhatian (Cukup)',
        badgeColor: 'warning' as const,
        description: 'Tabunganmu di bawah 20%. Cobalah sisihkan lebih awal di awal bulan.',
        scoreColor: 'text-amber-400',
        gaugeBg: 'bg-amber-500',
        icon: '💡',
      }
    }
    if (savingsRate < 45) {
      return {
        label: 'Finansial Sehat & Terkendali',
        badgeColor: 'income' as const,
        description: 'Bagus sekali! Rasio tabunganmu sudah sangat ideal untuk dana darurat.',
        scoreColor: 'text-green-400',
        gaugeBg: 'bg-green-500',
        icon: '🌟',
      }
    }
    return {
      label: 'Super Hemat & Sultan',
      badgeColor: 'brand' as const,
      description: 'Luar biasa! Tingkat tabunganmu di atas 45%. Jalur cepat kebebasan finansial!',
      scoreColor: 'text-emerald-400',
      gaugeBg: 'bg-emerald-400',
      icon: '🚀',
    }
  }, [netBalance, savingsRate])

  const handleAddTransaction = (action: QuickAction) => {
    const now = new Date()
    const timeStr = `Hari ini, ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`

    const newTx: MockTransactionProps = {
      category: action.category,
      icon: action.icon,
      description: action.description,
      date: timeStr,
      amount: action.amount,
      type: action.type,
    }

    setExtraTransactions((prev) => [newTx, ...prev])

    if (action.type === 'INCOME') {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#22c55e', '#4ade80', '#10b981'],
        })
      } catch {
        // safe fallback
      }
    }
  }

  const handleReset = () => {
    setMonthlyIncome(8500000)
    setMonthlyFixedExpense(4200000)
    setExtraTransactions([
      {
        category: 'Food',
        icon: '🍔',
        description: 'Makan Malam Keluarga',
        date: 'Hari ini, 19:30',
        amount: 125000,
        type: 'EXPENSE',
      },
      {
        category: 'Business',
        icon: '📈',
        description: 'Fee Desain Logo',
        date: 'Kemarin, 14:15',
        amount: 1200000,
        type: 'INCOME',
      },
    ])
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <section id="simulator" className="py-20 sm:py-28 relative scroll-mt-20">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-green-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badgeText="✨ Fitur Interaktif Pembeda"
          badgeVariant="brand"
          title={
            <>
              Coba Sensasi Mencatat di{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-300">
                SaveMe Playground
              </span>
            </>
          }
          subtitle="Tanpa perlu login atau daftar dulu. Atur angka pemasukanmu, klik tombol transaksi instan di bawah, dan rasakan kepuasan melihat data finansialmu tertata rapi seketika."
        />

        {/* Main Interactive Playground Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sliders & Quick Actions (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Simulator Control Card */}
            <div className="bg-[#1a1d27] border border-[#2d3348] rounded-2xl p-6 sm:p-8 shadow-xl relative">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2d3348]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Simulasi Anggaran Bulanan</h3>
                    <p className="text-xs text-slate-400">Geser slider untuk menyesuaikan kondisimu</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Reset
                </Button>
              </div>

              {/* Sliders */}
              <div className="flex flex-col gap-4 mb-8">
                <PlaygroundSlider
                  label="Estimasi Pemasukan Pokok / Bulan"
                  value={monthlyIncome}
                  min={2000000}
                  max={50000000}
                  step={500000}
                  onChange={setMonthlyIncome}
                  color="green"
                  icon={<TrendingUp className="w-4 h-4 text-green-400" />}
                />

                <PlaygroundSlider
                  label="Estimasi Pengeluaran Rutin / Bulan"
                  value={monthlyFixedExpense}
                  min={1000000}
                  max={40000000}
                  step={250000}
                  onChange={setMonthlyFixedExpense}
                  color="red"
                  icon={<Wallet className="w-4 h-4 text-red-400" />}
                />
              </div>

              {/* Quick Add Transactions Chips */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5 text-green-400" />
                    Coba Tambah Transaksi Instan (Klik Chip)
                  </span>
                  <span className="text-[11px] text-slate-500">Live preview</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {QUICK_ACTIONS.map((action, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddTransaction(action)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all duration-150 active:scale-95 cursor-pointer hover:-translate-y-0.5',
                        action.type === 'INCOME'
                          ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-slate-200'
                          : 'bg-[#21263a] hover:bg-[#282e44] border-[#2d3348] text-slate-200'
                      )}
                    >
                      <span className="text-lg shrink-0">{action.icon}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate text-slate-200">
                          {action.description}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] font-mono font-bold tabular-nums',
                            action.type === 'INCOME' ? 'text-green-400' : 'text-slate-400'
                          )}
                        >
                          {action.type === 'INCOME' ? '+' : '-'}
                          {new Intl.NumberFormat('id-ID', {
                            notation: 'compact',
                            compactDisplay: 'short',
                          }).format(action.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive Transaction Feed */}
            <div className="bg-[#1a1d27] border border-[#2d3348] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-400" />
                  <h4 className="text-sm font-bold text-white">Log Transaksi Real-Time ({extraTransactions.length})</h4>
                </div>
                <span className="text-xs text-slate-500">Urut dari terbaru</span>
              </div>

              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                {extraTransactions.slice(0, 5).map((tx, i) => (
                  <MockTransaction key={i} {...tx} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Health Gauge & 1-Year Forecast (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Financial Health & Balance Card */}
            <div className="bg-gradient-to-b from-[#1e2333] to-[#1a1d27] border border-[#2d3348] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <PiggyBank className="w-32 h-32 text-green-400" />
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between mb-6">
                <Badge variant={healthStatus.badgeColor} dot size="md">
                  {healthStatus.label}
                </Badge>
                <span className="text-2xl">{healthStatus.icon}</span>
              </div>

              {/* Net Balance */}
              <div className="mb-6">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Sisa Saldo Bersih / Bulan
                </span>
                <div
                  className={cn(
                    'text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight mt-1',
                    netBalance >= 0 ? 'text-white' : 'text-red-400'
                  )}
                >
                  {formatRupiah(netBalance)}
                </div>
              </div>

              {/* Savings Rate Bar */}
              <div className="mb-6 p-4 rounded-xl bg-[#0f1117]/60 border border-[#2d3348]/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-green-400" />
                    Rasio Tabungan
                  </span>
                  <span className={cn('text-sm font-bold font-mono', healthStatus.scoreColor)}>
                    {savingsRate}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-[#21263a] rounded-full overflow-hidden p-0.5 border border-[#2d3348]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', healthStatus.gaugeBg)}
                    style={{ width: `${Math.min(100, Math.max(5, savingsRate))}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  {healthStatus.description}
                </p>
              </div>

              {/* 1 Year Projection Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-transparent border border-green-500/30 mb-6">
                <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Proyeksi 1 Tahun ke Depan
                </span>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  {formatRupiah(oneYearSavings)}
                </div>
                <span className="text-xs text-slate-300 mt-0.5 block">
                  Potensi tabungan terkumpul jika kamu konsisten mencatat di SaveMe!
                </span>
              </div>

              {/* CTA from Playground */}
              <div className="pt-2">
                <Link href="/register" className="w-full block">
                  <Button variant="glow" size="lg" className="w-full justify-center text-sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Mulai Catat Keuangan Aslimu
                  </Button>
                </Link>
                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                  <span>Daftar gratis tanpa kartu kredit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
