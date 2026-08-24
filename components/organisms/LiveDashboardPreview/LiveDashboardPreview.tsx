'use client'

import React, { useState } from 'react'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { Badge } from '@/components/atoms/Badge'
import {
  LayoutDashboard,
  ReceiptText,
  User,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Period = 'month' | 'week' | 'today'

interface PeriodData {
  balance: number
  income: number
  expense: number
  transactions: {
    category: string
    icon: string
    title: string
    date: string
    amount: number
    type: 'INCOME' | 'EXPENSE'
  }[]
  categories: {
    name: string
    icon: string
    amount: number
    percent: number
    color: string
  }[]
}

const PREVIEW_DATA: Record<Period, PeriodData> = {
  month: {
    balance: 7850000,
    income: 14500000,
    expense: 6650000,
    transactions: [
      { category: 'Salary', icon: '💼', title: 'Gaji Bulanan PT Maju', date: '28 Feb 2026', amount: 12000000, type: 'INCOME' },
      { category: 'Food', icon: '🍔', title: 'Dinner & Groceries', date: '27 Feb 2026', amount: 350000, type: 'EXPENSE' },
      { category: 'Bills', icon: '📄', title: 'Tagihan Listrik & PLN', date: '25 Feb 2026', amount: 480000, type: 'EXPENSE' },
      { category: 'Business', icon: '📈', title: 'Fee Project UI/UX', date: '22 Feb 2026', amount: 2500000, type: 'INCOME' },
      { category: 'Shopping', icon: '🛍️', title: 'Sepatu Olahraga', date: '19 Feb 2026', amount: 790000, type: 'EXPENSE' },
    ],
    categories: [
      { name: 'Food', icon: '🍔', amount: 2400000, percent: 36, color: 'bg-amber-400' },
      { name: 'Shopping', icon: '🛍️', amount: 1800000, percent: 27, color: 'bg-purple-400' },
      { name: 'Bills', icon: '📄', amount: 1450000, percent: 22, color: 'bg-blue-400' },
      { name: 'Transportation', icon: '🚗', amount: 1000000, percent: 15, color: 'bg-emerald-400' },
    ],
  },
  week: {
    balance: 2150000,
    income: 3500000,
    expense: 1350000,
    transactions: [
      { category: 'Business', icon: '📈', title: 'Fee Project UI/UX', date: 'Kemarin', amount: 2500000, type: 'INCOME' },
      { category: 'Food', icon: '🍔', title: 'Makan Bersama Tim', date: 'Kemarin', amount: 280000, type: 'EXPENSE' },
      { category: 'Other', icon: '📦', title: 'Jual Barang Bekas', date: '2 hari lalu', amount: 1000000, type: 'INCOME' },
      { category: 'Transportation', icon: '🚗', title: 'Bensin & Parkir', date: '3 hari lalu', amount: 150000, type: 'EXPENSE' },
    ],
    categories: [
      { name: 'Food', icon: '🍔', amount: 650000, percent: 48, color: 'bg-amber-400' },
      { name: 'Transportation', icon: '🚗', amount: 400000, percent: 30, color: 'bg-emerald-400' },
      { name: 'Shopping', icon: '🛍️', amount: 300000, percent: 22, color: 'bg-purple-400' },
    ],
  },
  today: {
    balance: 385000,
    income: 500000,
    expense: 115000,
    transactions: [
      { category: 'Other', icon: '🎁', title: 'Cashback E-Wallet', date: 'Hari ini 14:00', amount: 500000, type: 'INCOME' },
      { category: 'Food', icon: '☕', title: 'Kopi & Croissant', date: 'Hari ini 09:30', amount: 450000, type: 'EXPENSE' },
      { category: 'Transportation', icon: '🚕', title: 'Ojek Online', date: 'Hari ini 08:15', amount: 70000, type: 'EXPENSE' },
    ],
    categories: [
      { name: 'Food', icon: '☕', amount: 45000, percent: 39, color: 'bg-amber-400' },
      { name: 'Transportation', icon: '🚕', amount: 70000, percent: 61, color: 'bg-emerald-400' },
    ],
  },
}

export function LiveDashboardPreview() {
  const [activePeriod, setActivePeriod] = useState<Period>('month')
  const data = PREVIEW_DATA[activePeriod]

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <section id="preview" className="py-20 sm:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badgeText="📊 Tampilan Asli Dashboard"
          badgeVariant="purple"
          title={
            <>
              Intuitif, Bersih, dan{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-green-400">
                Mudah Dipahami
              </span>
            </>
          }
          subtitle="Lihat bagaimana SaveMe menyajikan rangkuman finansialmu tanpa grafik berbelit-belit. Coba ganti filter waktu di bawah!"
        />

        {/* Dashboard Mock Container with Browser Shell */}
        <div className="relative rounded-2xl border border-slate-200 dark:border-[#2d3348] bg-white dark:bg-[#1a1d27] shadow-xl dark:shadow-2xl overflow-hidden text-slate-900 dark:text-white">
          {/* Browser Top Bar */}
          <div className="bg-slate-100 dark:bg-[#0f1117] px-4 py-3 border-b border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs text-slate-500 font-mono ml-2 hidden sm:inline-block">
                app.saveme.id/dashboard
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="brand" size="sm" dot>
                Demo Live
              </Badge>
            </div>
          </div>

          {/* Inner App Mockup */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
            {/* Sidebar Mock (3 Cols on Desktop) */}
            <div className="hidden md:flex md:col-span-3 bg-white dark:bg-[#131620] p-5 border-r border-slate-200 dark:border-[#2d3348] flex-col justify-between">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white tracking-tight">
                  <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center text-slate-950 text-xs font-black">
                    S
                  </div>
                  <span>SaveMe App</span>
                </div>

                <nav className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-green-500/15 text-green-700 dark:text-green-400 font-semibold text-sm">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm font-medium">
                    <ReceiptText className="w-4 h-4" />
                    <span>Transaksi</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm font-medium">
                    <User className="w-4 h-4" />
                    <span>Profil Pengguna</span>
                  </div>
                </nav>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold">
                  AK
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Andi Kurniawan</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">andi@example.com</span>
                </div>
              </div>
            </div>

            {/* Main Content Area (9 Cols) */}
            <div className="col-span-1 md:col-span-9 p-5 sm:p-7 bg-slate-50/70 dark:bg-[#0f1117]/80 flex flex-col gap-6">
              {/* Header inside Dashboard with interactive period filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ringkasan Keuangan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pantau pergerakan kas masuk dan keluar</p>
                </div>

                {/* Period Selector Tabs */}
                <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActivePeriod('today')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      activePeriod === 'today'
                        ? 'bg-green-500 text-slate-950 font-bold shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePeriod('week')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      activePeriod === 'week'
                        ? 'bg-green-500 text-slate-950 font-bold shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Minggu Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePeriod('month')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      activePeriod === 'month'
                        ? 'bg-green-500 text-slate-950 font-bold shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Bulan Ini
                  </button>
                </div>
              </div>

              {/* Payday Banner Mockup */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      H-6 Menuju Gajian
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 ml-2">
                      Jatah Safe-to-Spend: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">Rp 125.000/hari</strong>
                    </span>
                  </div>
                </div>
                <Badge variant="brand" size="sm">
                  Keuangan Terkendali
                </Badge>
              </div>

              {/* 3 Summary Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Total Balance / Net Worth Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-medium">Kas Operasional</span>
                    <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatRupiah(data.balance)}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">
                    Siap untuk belanja harian
                  </span>
                </div>

                {/* Tabungan Beku Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-medium">Celengan Impian (Beku)</span>
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatRupiah(data.balance * 1.5)}
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                    🔒 Terkunci aman (Anti-Bocor)
                  </span>
                </div>

                {/* Expense Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-medium">Pengeluaran Periode Ini</span>
                    <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400 tabular-nums">
                    {formatRupiah(data.expense)}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    {data.transactions.filter((t) => t.type === 'EXPENSE').length} transaksi tercatat
                  </span>
                </div>
              </div>

              {/* Bottom Section: Category Progress & Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Category Breakdown (5 Cols) */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex flex-col justify-between shadow-xs">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                      Pengeluaran per Kategori
                    </h4>
                    <div className="flex flex-col gap-3">
                      {data.categories.map((cat, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                              <span>{cat.icon}</span>
                              <span>{cat.name}</span>
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                              {cat.percent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-[#21263a] rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-300', cat.color)}
                              style={{ width: `${cat.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-[#2d3348] text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    <span>Auto-dikategorikan saat input transaksi</span>
                  </div>
                </div>

                {/* Recent Transaction List (7 Cols) */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                    Transaksi Terakhir
                  </h4>
                  <div className="flex flex-col gap-2">
                    {data.transactions.slice(0, 4).map((tx, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#21263a]/60 border border-slate-200/80 dark:border-[#2d3348]/60 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{tx.icon}</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{tx.title}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{tx.date}</span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'font-mono font-bold tabular-nums',
                            tx.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {tx.type === 'INCOME' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
