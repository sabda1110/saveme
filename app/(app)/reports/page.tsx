'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { transactionService } from '@/lib/services/transaction.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Copy,
  Check,
  Tag,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Flame,
  RefreshCw,
} from 'lucide-react'
import type { Transaction } from '@/types'
import { cn } from '@/lib/utils/cn'

type ReportPeriod = 'month' | 'last_month' | 'last_3_months' | 'year' | 'all'

export default function ReportsPage() {
  const { user, userProfile } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const txs = await transactionService.getUserTransactions(user.uid)
        if (isMounted) {
          setTransactions(txs)
        }
      } catch (error) {
        console.error('[reports] Error loading transactions:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [user?.uid, refreshTrigger])

  // Filter transactions based on ReportPeriod
  const filteredTransactions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return transactions.filter((tx) => {
      const txDate = new Date(tx.transactionDate)

      if (period === 'month') {
        return (
          txDate.getFullYear() === currentYear &&
          txDate.getMonth() === currentMonth
        )
      }
      if (period === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return (
          txDate.getFullYear() === targetYear &&
          txDate.getMonth() === lastMonth
        )
      }
      if (period === 'last_3_months') {
        const threeMonthsAgo = new Date(now)
        threeMonthsAgo.setMonth(now.getMonth() - 3)
        return txDate >= threeMonthsAgo
      }
      if (period === 'year') {
        return txDate.getFullYear() === currentYear
      }
      return true // 'all'
    })
  }, [transactions, period])

  // Calculation Metrics
  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  )

  const totalExpense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  )

  const netSavings = totalIncome - totalExpense
  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; icon: string; amount: number }> = {}

    filteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        if (!map[t.categoryId]) {
          map[t.categoryId] = {
            name: t.categoryName,
            icon: t.categoryIcon,
            amount: 0,
          }
        }
        map[t.categoryId].amount += t.amount
      })

    return Object.values(map)
      .map((cat) => ({
        ...cat,
        percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions, totalExpense])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Financial Health Assessment
  const healthStatus = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) {
      return {
        label: 'Belum Ada Aktivitas',
        score: 'Neutral',
        desc: 'Belum ada transaksi yang tercatat pada periode ini.',
        color: 'text-slate-400',
        badge: 'neutral' as const,
        icon: <Sparkles className="w-5 h-5 text-slate-400" />,
      }
    }
    if (netSavings < 0) {
      return {
        label: 'Defisit / Boncos ⚠️',
        score: 'Perlu Perhatian',
        desc: `Pengeluaran melebihi pemasukan sebesar ${formatRupiah(Math.abs(netSavings))}. Segera evaluasi pos belanja non-primer!`,
        color: 'text-red-400',
        badge: 'expense' as const,
        icon: <Flame className="w-5 h-5 text-red-400" />,
      }
    }
    if (savingsRate >= 20) {
      return {
        label: 'Sangat Sehat & Optimal 🌟',
        score: 'Grade A',
        desc: `Kamu berhasil menabung ${savingsRate}% dari total pemasukanmu. Memenuhi kaidah ideal 50/30/20!`,
        color: 'text-green-400',
        badge: 'brand' as const,
        icon: <ShieldCheck className="w-5 h-5 text-green-400" />,
      }
    }
    return {
      label: 'Cukup Sehat / Pas-pasan 🟡',
      score: 'Grade B',
      desc: `Rasio tabungan ${savingsRate}%. Sedikit lagi menuju target ideal 20%. Coba kurangi pengeluaran gaya hidup.`,
      color: 'text-amber-400',
      badge: 'warning' as const,
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    }
  }, [netSavings, savingsRate, totalIncome, totalExpense])

  const periodLabelMap: Record<ReportPeriod, string> = {
    month: 'Bulan Ini',
    last_month: 'Bulan Lalu',
    last_3_months: '3 Bulan Terakhir',
    year: 'Tahun Ini',
    all: 'Semua Riwayat',
  }

  const handleCopyReport = () => {
    const text = `📊 *LAPORAN KEUANGAN SAVEME*
Periode: ${periodLabelMap[period]}
Pengguna: ${userProfile?.name || 'User SaveMe'}

💰 Total Pemasukan: +${formatRupiah(totalIncome)}
💸 Total Pengeluaran: -${formatRupiah(totalExpense)}
📈 Saldo Bersih: ${netSavings >= 0 ? '+' : '-'}${formatRupiah(Math.abs(netSavings))}
🎯 Rasio Tabungan: ${savingsRate}%
🛡️ Status Kesehatan: ${healthStatus.label}

Kategori Pengeluaran Terbesar:
${categoryBreakdown
  .slice(0, 5)
  .map((c, i) => `${i + 1}. ${c.icon} ${c.name}: ${formatRupiah(c.amount)} (${c.percentage}%)`)
  .join('\n')}

_Dihasilkan otomatis oleh SaveMe App_`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Laporan & Analitik
              </h1>
              <p className="text-xs text-slate-400">
                Evaluasi performa arus kas, alokasi pengeluaran, dan rasio tabunganmu
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            title="Muat ulang data"
            className="text-xs px-2.5 sm:px-3"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyReport}
            className="text-xs sm:text-sm px-3 sm:px-4 ml-auto sm:ml-0"
            leftIcon={copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Tersalin!' : 'Salin Ringkasan'}
          </Button>
        </div>
      </div>

      {/* Period Tabs (Horizontal Touch Scrollable) */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] overflow-x-auto max-w-full no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {(['month', 'last_month', 'last_3_months', 'year', 'all'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
                period === p
                  ? 'bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {periodLabelMap[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Health Score Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#1a1d27] via-[#1e2436] to-[#1a1d27] border border-[#2d3348] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#21263a] border border-[#2d3348] shrink-0 shadow-inner">
            {healthStatus.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Kesehatan Finansial ({periodLabelMap[period]})
              </span>
              <Badge variant={healthStatus.badge} size="sm">
                {healthStatus.score}
              </Badge>
            </div>
            <h3 className={cn('text-base sm:text-xl font-extrabold', healthStatus.color)}>
              {healthStatus.label}
            </h3>
            <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">{healthStatus.desc}</p>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#21263a]/80 border border-[#2d3348] flex items-center justify-between md:flex-col md:items-end gap-1 shrink-0">
          <span className="text-xs text-slate-400">Rasio Tabungan:</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-green-400">{savingsRate}%</span>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-green-400">
              Pemasukan
            </span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono text-green-400 tabular-nums">
            +{formatRupiah(totalIncome)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
            {filteredTransactions.filter((t) => t.type === 'INCOME').length} transaksi
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-red-400">
              Pengeluaran
            </span>
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono text-red-400 tabular-nums">
            -{formatRupiah(totalExpense)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
            {filteredTransactions.filter((t) => t.type === 'EXPENSE').length} transaksi
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Saldo Bersih
            </span>
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
          </div>
          <div
            className={cn(
              'text-base sm:text-2xl font-bold font-mono tabular-nums',
              netSavings >= 0 ? 'text-white' : 'text-red-400'
            )}
          >
            {formatRupiah(netSavings)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
            {netSavings >= 0 ? 'Surplus' : 'Defisit'}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Rasio Tabungan
            </span>
            <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono text-green-400 tabular-nums">
            {savingsRate}%
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
            Target: 20%
          </span>
        </div>
      </div>

      {/* Top 5 Expense Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-4 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 border-b border-[#2d3348]">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Pos Pengeluaran Terbesar
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {categoryBreakdown.length} Kategori
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Belum ada transaksi pengeluaran pada periode ini.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {categoryBreakdown.slice(0, 6).map((cat, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-200 flex items-center gap-2 font-medium">
                      <span className="text-base sm:text-lg">{cat.icon}</span>
                      <span className="truncate max-w-[120px] sm:max-w-none">{cat.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-200 font-bold">
                        {formatRupiah(cat.amount)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({cat.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 sm:h-2.5 bg-[#21263a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions in Period List */}
        <div className="lg:col-span-6 p-4 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Riwayat Periode Ini ({filteredTransactions.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {periodLabelMap[period]}
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Tidak ada riwayat transaksi pada filter waktu ini.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                {filteredTransactions.slice(0, 10).map((tx) => {
                  const isIncome = tx.type === 'INCOME'
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-[#21263a]/40 border border-[#2d3348] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base">{tx.categoryIcon || '📦'}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tx.transactionDate}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'font-bold font-mono tabular-nums shrink-0 pl-2',
                          isIncome ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#2d3348] mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Dihasilkan secara real-time dari Firestore</span>
            <span className="font-mono text-slate-300">SaveMe Engine</span>
          </div>
        </div>
      </div>
    </div>
  )
}
