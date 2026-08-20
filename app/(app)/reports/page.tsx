'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { transactionService } from '@/lib/services/transaction.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { MarkdownView } from '@/components/molecules/MarkdownView'
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet as WalletIcon,
  Copy,
  Check,
  Tag,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Flame,
  RefreshCw,
  Lock,
  Unlock,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react'
import type { Transaction, Wallet } from '@/types'
import { cn } from '@/lib/utils/cn'

type ReportPeriod = 'month' | 'last_month' | 'last_3_months' | 'year' | 'all'

export default function ReportsPage() {
  const { user, userProfile } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // AI Diagnostic State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [txs, wList] = await Promise.all([
          transactionService.getUserTransactions(user.uid),
          walletService.getUserWallets(user.uid),
        ])
        if (isMounted) {
          setTransactions(txs)
          setWallets(wList)
        }
      } catch (error) {
        console.error('[reports] Error loading report data:', error)
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

  // Multi-wallet structure: Operating vs Locked
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])
  const totalOperatingCash = useMemo(
    () => spendingWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [spendingWallets]
  )
  const totalLockedSavings = useMemo(
    () => lockedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [lockedWallets]
  )

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

  // Calculation Metrics for Current Period
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

  // Month-over-Month (MoM) Trend Metrics (Comparing current month vs previous month)
  const momComparison = useMemo(() => {
    const now = new Date()
    const curYear = now.getFullYear()
    const curMonth = now.getMonth()

    const curTxs = transactions.filter((t) => {
      const d = new Date(t.transactionDate)
      return d.getFullYear() === curYear && d.getMonth() === curMonth
    })

    const prevMonthIdx = curMonth === 0 ? 11 : curMonth - 1
    const prevYear = curMonth === 0 ? curYear - 1 : curYear
    const prevTxs = transactions.filter((t) => {
      const d = new Date(t.transactionDate)
      return d.getFullYear() === prevYear && d.getMonth() === prevMonthIdx
    })

    const curExpense = curTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    const prevExpense = prevTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    const curIncome = curTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
    const prevIncome = prevTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)

    const expenseDiff = curExpense - prevExpense
    const incomeDiff = curIncome - prevIncome

    const expenseChangePercent =
      prevExpense > 0 ? Math.round((expenseDiff / prevExpense) * 100) : 0
    const incomeChangePercent =
      prevIncome > 0 ? Math.round((incomeDiff / prevIncome) * 100) : 0

    return {
      hasPrevData: prevTxs.length > 0,
      prevExpense,
      curExpense,
      expenseDiff,
      expenseChangePercent,
      prevIncome,
      curIncome,
      incomeDiff,
      incomeChangePercent,
    }
  }, [transactions])

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

  // Mathematical Financial Health Scoring Engine (0 - 100)
  const healthScoreAnalysis = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) {
      return {
        score: 50,
        grade: 'Neutral',
        label: 'Belum Ada Data Cukup',
        desc: 'Catat transaksi pemasukan dan pengeluaran untuk melihat evaluasi skor finansial lengkap.',
        color: 'text-slate-400',
        badge: 'neutral' as const,
        icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
        breakdown: {
          savingsRateScore: 10,
          expenseControlScore: 15,
          cashflowScore: 10,
          lockedSavingsScore: 15,
        },
      }
    }

    // 1. Savings Rate Pillar (Max 35 pts)
    let p1 = 0
    if (savingsRate >= 30) p1 = 35
    else if (savingsRate >= 20) p1 = 30
    else if (savingsRate >= 10) p1 = 20
    else if (savingsRate > 0) p1 = 10
    else p1 = 0

    // 2. Expense Control vs Income Pillar (Max 25 pts)
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100
    let p2 = 0
    if (expenseRatio <= 50) p2 = 25
    else if (expenseRatio <= 70) p2 = 20
    else if (expenseRatio <= 85) p2 = 12
    else if (expenseRatio <= 100) p2 = 5
    else p2 = 0 // Overbudget / Deficit

    // 3. Cashflow Net Surplus Pillar (Max 20 pts)
    let p3 = 0
    if (netSavings > 0) p3 = 20
    else if (netSavings === 0) p3 = 8
    else p3 = 0

    // 4. Locked Savings & Emergency Safety Net Pillar (Max 20 pts)
    let p4 = 0
    if (totalLockedSavings > 0 && totalLockedSavings >= totalExpense) p4 = 20
    else if (totalLockedSavings > 0) p4 = 15
    else if (totalOperatingCash > 0) p4 = 8
    else p4 = 0

    const totalScore = Math.min(100, Math.max(0, p1 + p2 + p3 + p4))

    if (totalScore >= 85) {
      return {
        score: totalScore,
        grade: 'Grade A+',
        label: 'Sangat Sehat & Prima 🌟',
        desc: `Kondisi finansial luar biasa! Rasio tabungan ${savingsRate}% dan disiplin kantong beku sangat solid.`,
        color: 'text-emerald-400',
        badge: 'brand' as const,
        icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
        breakdown: { savingsRateScore: p1, expenseControlScore: p2, cashflowScore: p3, lockedSavingsScore: p4 },
      }
    }
    if (totalScore >= 70) {
      return {
        score: totalScore,
        grade: 'Grade A',
        label: 'Sehat & Terkendali 🟢',
        desc: `Arus kas positif dengan rasio tabungan ${savingsRate}%. Pertahankan konsistensi menjaga kas operasional.`,
        color: 'text-green-400',
        badge: 'brand' as const,
        icon: <ShieldCheck className="w-5 h-5 text-green-400" />,
        breakdown: { savingsRateScore: p1, expenseControlScore: p2, cashflowScore: p3, lockedSavingsScore: p4 },
      }
    }
    if (totalScore >= 50) {
      return {
        score: totalScore,
        grade: 'Grade B',
        label: 'Cukup Sehat / Pas-pasan 🟡',
        desc: `Rasio tabungan ${savingsRate}%. Waspadai pos belanja sekunder agar tidak tergerus menjadi defisit.`,
        color: 'text-amber-400',
        badge: 'warning' as const,
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        breakdown: { savingsRateScore: p1, expenseControlScore: p2, cashflowScore: p3, lockedSavingsScore: p4 },
      }
    }
    return {
      score: totalScore,
      grade: 'Grade C/D',
      label: 'Boros / Defisit ⚠️',
      desc: `Pengeluaran melebihi pemasukan atau rasio belanja terlalu tinggi (${formatRupiah(totalExpense)}). Segera pangkas kebocoran halus!`,
      color: 'text-red-400',
      badge: 'expense' as const,
      icon: <Flame className="w-5 h-5 text-red-400" />,
      breakdown: { savingsRateScore: p1, expenseControlScore: p2, cashflowScore: p3, lockedSavingsScore: p4 },
    }
  }, [netSavings, savingsRate, totalIncome, totalExpense, totalLockedSavings, totalOperatingCash])

  const periodLabelMap: Record<ReportPeriod, string> = {
    month: 'Bulan Ini',
    last_month: 'Bulan Lalu',
    last_3_months: '3 Bulan Terakhir',
    year: 'Tahun Ini',
    all: 'Semua Riwayat',
  }

  // Trigger Gemini AI Diagnostic Analysis
  const handleGenerateAiReport = async () => {
    setIsAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isReportMode: true,
          reportData: {
            periodLabel: periodLabelMap[period],
            totalIncome,
            totalExpense,
            netSavings,
            savingsRate,
            healthScore: healthScoreAnalysis.score,
            healthGrade: healthScoreAnalysis.grade,
            topCategories: categoryBreakdown.slice(0, 5),
            momComparison: momComparison.hasPrevData
              ? {
                  expenseChangePercent: momComparison.expenseChangePercent,
                  incomeChangePercent: momComparison.incomeChangePercent,
                  expenseDiff: momComparison.expenseDiff,
                  incomeDiff: momComparison.incomeDiff,
                }
              : undefined,
            operatingCash: totalOperatingCash,
            lockedSavings: totalLockedSavings,
          },
        }),
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.error || 'Gagal memanggil AI Advisor.')
      }

      const data = await response.json()
      setAiAnalysis(data.advice)
    } catch (err: unknown) {
      console.error('[reports] Error generating AI report:', err)
      const errObj = err as { message?: string }
      setAiError(errObj.message || 'Terjadi kesalahan saat meminta evaluasi AI.')
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleCopyReport = () => {
    const text = `📊 *LAPORAN & ANALITIK KEUANGAN SAVEME*
Periode: ${periodLabelMap[period]}
Pengguna: ${userProfile?.name || 'User SaveMe'}

🛡️ SKOR KESEHATAN FINANSIAL: ${healthScoreAnalysis.score}/100 (${healthScoreAnalysis.grade})
Status: ${healthScoreAnalysis.label}

💰 Total Pemasukan: +${formatRupiah(totalIncome)}
💸 Total Pengeluaran: -${formatRupiah(totalExpense)}
📈 Saldo Bersih: ${netSavings >= 0 ? '+' : '-'}${formatRupiah(Math.abs(netSavings))}
🎯 Rasio Tabungan: ${savingsRate}% (Target: 20%)

STRUKTUR KANTONG KAS:
🟢 Kas Belanja Aktif: ${formatRupiah(totalOperatingCash)}
🔒 Tabungan Beku / Dana Terkunci: ${formatRupiah(totalLockedSavings)}

${
  momComparison.hasPrevData
    ? `TREN DIBANDING BULAN LALU:
• Pengeluaran: ${momComparison.expenseChangePercent >= 0 ? '+' : ''}${momComparison.expenseChangePercent}% (${momComparison.expenseDiff >= 0 ? 'Naik' : 'Turun'} ${formatRupiah(Math.abs(momComparison.expenseDiff))})
• Pemasukan: ${momComparison.incomeChangePercent >= 0 ? '+' : ''}${momComparison.incomeChangePercent}%\n`
    : ''
}
Kategori Pengeluaran Terbesar:
${categoryBreakdown
  .slice(0, 5)
  .map((c, i) => `${i + 1}. ${c.icon} ${c.name}: ${formatRupiah(c.amount)} (${c.percentage}%)`)
  .join('\n')}

${aiAnalysis ? `\n🤖 KESIMPULAN DIAGNOSIS AI:\n${aiAnalysis}\n` : ''}
_Dihasilkan otomatis oleh SaveMe App_`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Laporan &amp; Analitik Keuangan
              </h1>
              <p className="text-xs text-slate-400">
                Analisis kesehatan arus kas, perbandingan bulanan, dan evaluasi SaveMe AI Coach
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
            {copied ? 'Tersalin!' : 'Salin Laporan'}
          </Button>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] overflow-x-auto max-w-full no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {(['month', 'last_month', 'last_3_months', 'year', 'all'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriod(p)
                setAiAnalysis(null)
              }}
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

      {/* 🌟 1. Financial Health Score & Diagnostic Banner */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#1a1d27] via-[#1a2133] to-[#1a1d27] border border-[#2d3348] shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative flex items-center justify-center shrink-0">
            {/* Score Ring Progress */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#21263a] border border-[#2d3348] flex flex-col items-center justify-center shadow-inner">
              <span className={cn('text-xl sm:text-2xl font-black font-mono', healthScoreAnalysis.color)}>
                {healthScoreAnalysis.score}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">SKOR / 100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Skor Kesehatan ({periodLabelMap[period]})
              </span>
              <Badge variant={healthScoreAnalysis.badge} size="sm">
                {healthScoreAnalysis.grade}
              </Badge>
            </div>
            <h3 className={cn('text-base sm:text-xl font-extrabold flex items-center gap-2', healthScoreAnalysis.color)}>
              {healthScoreAnalysis.label}
            </h3>
            <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">{healthScoreAnalysis.desc}</p>
          </div>
        </div>

        {/* 4 Pillars Mini Score */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-2xl bg-[#21263a]/70 border border-[#2d3348] shrink-0 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Tabungan (35%)</span>
            <span className="font-bold font-mono text-green-400">{healthScoreAnalysis.breakdown.savingsRateScore} pts</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Kontrol Belanja (25%)</span>
            <span className="font-bold font-mono text-blue-400">{healthScoreAnalysis.breakdown.expenseControlScore} pts</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Surplus Kas (20%)</span>
            <span className="font-bold font-mono text-amber-400">{healthScoreAnalysis.breakdown.cashflowScore} pts</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Kantong Beku (20%)</span>
            <span className="font-bold font-mono text-purple-400">{healthScoreAnalysis.breakdown.lockedSavingsScore} pts</span>
          </div>
        </div>
      </div>

      {/* 🤖 2. AI Financial Diagnostic Advisor Card */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#1a1d27] via-[#1f2038] to-[#1a1d27] border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2d3348]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Diagnosis Keuangan AI SaveMe
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300">
                  AI Coach
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Analisis otomatis apakah pengeluaranmu sehat, boros, dan rekomendasi aksi bulan depan
              </p>
            </div>
          </div>

          <Button
            variant="glow"
            size="sm"
            onClick={handleGenerateAiReport}
            loading={isAiLoading}
            leftIcon={<Sparkles className="w-4 h-4 text-purple-200" />}
            className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 font-bold shrink-0 cursor-pointer"
          >
            {aiAnalysis ? 'Perbarui Analisis AI' : 'Jalankan Diagnosis AI'}
          </Button>
        </div>

        {aiError && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {aiError}
          </div>
        )}

        {isAiLoading && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 animate-in fade-in">
            <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-xs text-purple-300 font-mono">
              SaveMe AI Coach sedang menganalisis seluruh data transaksi, kantong beku &amp; tren...
            </span>
          </div>
        )}

        {!isAiLoading && aiAnalysis && (
          <div className="mt-5 p-4 sm:p-6 rounded-2xl bg-[#131620]/90 border border-purple-500/20 text-xs sm:text-sm text-slate-200 leading-relaxed animate-in fade-in">
            <MarkdownView content={aiAnalysis} />
          </div>
        )}

        {!isAiLoading && !aiAnalysis && (
          <div className="mt-4 p-4 rounded-2xl bg-[#131620]/40 border border-[#2d3348]/60 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Klik tombol di atas untuk melihat diagnosis mendalam mengenai kebiasaan belanja dan kesehatan tabunganmu di periode ini.
            </span>
            <Sparkles className="w-4 h-4 text-purple-400/60 shrink-0 ml-2" />
          </div>
        )}
      </div>

      {/* 📈 3. Month-over-Month (MoM) Comparison Strip */}
      {momComparison.hasPrevData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Expense MoM */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-between shadow-lg">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tren Pengeluaran vs Bulan Lalu
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-white">
                  {formatRupiah(momComparison.curExpense)}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-xs font-bold font-mono flex items-center gap-0.5',
                    momComparison.expenseChangePercent > 0
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  )}
                >
                  {momComparison.expenseChangePercent > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {momComparison.expenseChangePercent > 0 ? '+' : ''}
                  {momComparison.expenseChangePercent}%
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400 text-right">
              {momComparison.expenseDiff > 0 ? 'Naik' : 'Hemat'}{' '}
              <strong className="text-slate-200 font-mono">
                {formatRupiah(Math.abs(momComparison.expenseDiff))}
              </strong>
            </span>
          </div>

          {/* Income MoM */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-between shadow-lg">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tren Pemasukan vs Bulan Lalu
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-white">
                  +{formatRupiah(momComparison.curIncome)}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-xs font-bold font-mono flex items-center gap-0.5',
                    momComparison.incomeChangePercent >= 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-amber-500/20 text-amber-400'
                  )}
                >
                  {momComparison.incomeChangePercent >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {momComparison.incomeChangePercent >= 0 ? '+' : ''}
                  {momComparison.incomeChangePercent}%
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400 text-right">
              {momComparison.incomeDiff >= 0 ? 'Naik' : 'Turun'}{' '}
              <strong className="text-slate-200 font-mono">
                {formatRupiah(Math.abs(momComparison.incomeDiff))}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* 💳 4. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Income */}
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

        {/* Total Expense */}
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

        {/* Net Savings */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Saldo Bersih
            </span>
            <WalletIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
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
            {netSavings >= 0 ? 'Surplus Arus Kas' : 'Defisit Arus Kas'}
          </span>
        </div>

        {/* Savings Rate */}
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
            Target Ideal: 20%
          </span>
        </div>
      </div>

      {/* 🔒 5. Multi-Wallet Cash Distribution (Operating vs Frozen) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2d3348]">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Struktur Saldo &amp; Kantong Keuangan
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {wallets.length} Kantong Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Operating Cash */}
          <div className="p-4 rounded-xl bg-[#21263a]/50 border border-green-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5" />
                Kas Belanja Aktif (Operasional)
              </span>
              <span className="text-xs font-mono font-bold text-green-400">
                {formatRupiah(totalOperatingCash)}
              </span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {spendingWallets.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Belum ada kantong operasional</span>
              ) : (
                spendingWallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-xs text-slate-300">
                    <span>{w.icon || '💳'} {w.name}</span>
                    <span className="font-mono">{formatRupiah(w.balance)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Locked Savings */}
          <div className="p-4 rounded-xl bg-[#21263a]/50 border border-purple-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Tabungan Beku &amp; Dana Terkunci
              </span>
              <span className="text-xs font-mono font-bold text-purple-400">
                {formatRupiah(totalLockedSavings)}
              </span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {lockedWallets.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Belum ada kantong simpanan beku</span>
              ) : (
                lockedWallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-xs text-slate-300">
                    <span>{w.icon || '🔒'} {w.name}</span>
                    <span className="font-mono">{formatRupiah(w.balance)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📊 6. Categories & Transaction History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Expense Categories Breakdown */}
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
