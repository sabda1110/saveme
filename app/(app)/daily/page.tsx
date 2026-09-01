'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { transactionService } from '@/lib/services/transaction.firebase'
import { recurringService } from '@/lib/services/recurring.firebase'
import { savingsService } from '@/lib/services/savings.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { groupSavingsService } from '@/lib/services/group-savings.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { MarkdownView } from '@/components/molecules/MarkdownView'
import { Skeleton } from '@/components/atoms/Skeleton'
import {
  Compass,
  Sparkles,
  Bot,
  Flame,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShoppingBag,
  Send,
  RefreshCw,
  Target,
  PiggyBank,
  Wallet as WalletIcon,
  Calendar,
  Layers,
  Lock,
  Unlock,
  Users,
  ShieldCheck,
} from 'lucide-react'
import type { RecurringBill, SavingsGoal, Transaction, Wallet, GroupSavings, GroupSavingsMember } from '@/types'
import { cn } from '@/lib/utils/cn'

type BudgetViewMode = 'daily' | 'weekly' | 'monthly'

export default function DailyBudgetPage() {
  const { user, userProfile } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [groupSavings, setGroupSavings] = useState<{
    group: GroupSavings
    member: GroupSavingsMember
    allMembers: GroupSavingsMember[]
  }[]>([])
  const [viewMode, setViewMode] = useState<BudgetViewMode>('daily')
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Gemini AI States
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAdvice, setAiAdvice] = useState<string | null>(null)

  // Spending Checker State ("Boleh Beli Gak Ya?")
  const [checkItemName, setCheckItemName] = useState('')
  const [checkItemPrice, setCheckItemPrice] = useState('')
  const [checkingItem, setCheckingItem] = useState(false)
  const [itemDecision, setItemDecision] = useState<string | null>(null)

  // Custom AI Query State
  const [customQuery, setCustomQuery] = useState('')
  const [askingQuery, setAskingQuery] = useState(false)
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null)

  // Auto-generate AI Advice callback
  const fetchAiAdvice = useCallback(
    async (
      income: number,
      bills: RecurringBill[],
      goals: SavingsGoal[],
      userWallets: Wallet[],
      todayExp: number,
      safeDaily: number,
      safeMonthly: number,
      totalSavings: number,
      savingsTargetRate: number
    ) => {
      setAiLoading(true)
      try {
        const totalBillsAmount = bills.reduce((sum, b) => sum + b.amount, 0)
        const res = await fetch('/api/ai/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthlyIncome: income,
            safeToSpendDaily: safeDaily,
            safeToSpendMonthly: safeMonthly,
            totalBills: totalBillsAmount,
            todayExpense: todayExp,
            savingsTargetRate,
            totalSavingsAccumulated: totalSavings,
            savingsGoals: goals.map((g) => ({
              name: g.name,
              target: g.targetAmount,
              current: g.currentAmount,
            })),
            wallets: userWallets.map((w) => ({
              name: w.name,
              type: w.type,
              balance: w.balance,
              isLocked: w.isLocked,
            })),
          }),
        })

        const data = await res.json()
        if (data.advice) {
          setAiAdvice(data.advice)
        }
      } catch (err) {
        console.error('[daily] Error auto-generating AI advice:', err)
      } finally {
        setAiLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [txs, bills, goals, userWallets, userGroups] = await Promise.all([
          transactionService.getUserTransactions(user.uid),
          recurringService.getUserRecurringBills(user.uid),
          savingsService.getUserGoals(user.uid),
          walletService.getUserWallets(user.uid),
          groupSavingsService.getUserGroups(user.uid),
        ])

        if (isMounted) {
          setTransactions(txs)
          setRecurringBills(bills)
          setSavingsGoals(goals)
          setWallets(userWallets)
          setGroupSavings(userGroups)

          // Calculate metrics for AI
          const income = userProfile?.monthlyIncome || 0
          const savingsRate = userProfile?.savingsTarget || 20
          const totalBillsAmount = bills.reduce((sum, b) => sum + b.amount, 0)
          const totalSavings = goals.reduce((sum, g) => sum + g.currentAmount, 0)
          
          const spendingWallets = userWallets.filter((w) => !w.isLocked)
          const operatingCash = spendingWallets.length > 0
            ? spendingWallets.reduce((sum, w) => sum + w.balance, 0)
            : Math.max(0, income - totalBillsAmount)

          const safeDaily = Math.max(0, Math.round(operatingCash / 30))
          const todayStr = new Date().toISOString().split('T')[0]
          const todayExp = txs
            .filter((t) => t.type === 'EXPENSE' && t.transactionDate === todayStr)
            .reduce((sum, t) => sum + t.amount, 0)

          // Auto-trigger Gemini AI Advice on load
          fetchAiAdvice(
            income,
            bills,
            goals,
            userWallets,
            todayExp,
            safeDaily,
            operatingCash,
            totalSavings,
            savingsRate
          )
        }
      } catch (err) {
        console.error('[daily] Error loading financial data:', err)
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
  }, [user?.uid, refreshTrigger, userProfile?.monthlyIncome, userProfile?.savingsTarget, fetchAiAdvice])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Interconnected Financial Calculations
  const monthlyIncome = userProfile?.monthlyIncome || 0
  const savingsTargetRate = userProfile?.savingsTarget || 20
  const totalBills = recurringBills.reduce((sum, b) => sum + b.amount, 0)

  // Multi-Wallet Segregation: Operating (unlocked & non-earmarked) / Earmarked / Locked
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked && !w.isEarmarked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])
  const earmarkedWallets = useMemo(() => wallets.filter((w) => w.isEarmarked && !w.isLocked), [wallets])

  const totalSpendingCash = useMemo(
    () => spendingWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [spendingWallets]
  )

  const totalLockedSavings = useMemo(
    () => lockedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [lockedWallets]
  )

  const totalEarmarkedCash = useMemo(
    () => earmarkedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [earmarkedWallets]
  )

  // Liquid Balance fallback from all transactions if no wallets yet
  const totalIncomeAll = useMemo(
    () => transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )
  const totalExpenseAll = useMemo(
    () => transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )
  const txLiquidBalance = totalIncomeAll - totalExpenseAll

  // Operating cash for daily budgeting: ONLY from unlocked, non-earmarked wallets!
  const effectiveOperatingCash = wallets.length > 0 ? totalSpendingCash : txLiquidBalance

  // Calendar dates
  const now = useMemo(() => new Date(), [])
  const currentDay = now.getDate()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemainingInMonth = Math.max(1, lastDayOfMonth - currentDay + 1)
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`

  const unpaidBillsThisMonth = useMemo(() => {
    return recurringBills
      .filter((b) => b.lastProcessedMonth !== currentMonthStr)
      .reduce((sum, b) => sum + b.amount, 0)
  }, [recurringBills, currentMonthStr])

  // Total Accumulated in Savings Goals
  const totalSavingsAccumulated = useMemo(() => {
    return savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0)
  }, [savingsGoals])

  // Daily Savings Required for Individual Goals
  const individualDailySavingsRequired = useMemo(() => {
    return savingsGoals.reduce((sum, g) => {
      if (!g.targetDate) return sum
      const targetD = new Date(g.targetDate)
      const diffDays = Math.max(1, Math.ceil((targetD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingTarget = Math.max(0, g.targetAmount - g.currentAmount)
      return sum + Math.round(remainingTarget / diffDays)
    }, 0)
  }, [savingsGoals, now])

  // Daily Savings Required for Group Savings (Celengan Bersama)
  const groupSavingsDailyRequired = useMemo(() => {
    return groupSavings.reduce((sum, g) => {
      if (!g.group.targetDate) return sum
      const targetD = new Date(g.group.targetDate)
      const diffDays = Math.max(1, Math.ceil((targetD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingTarget = Math.max(0, g.member.myTarget - g.member.myContributed)
      return sum + Math.round(remainingTarget / diffDays)
    }, 0)
  }, [groupSavings, now])

  // Combined Daily Savings Commitment (Pribadi + Bersama)
  const totalDailySavingsRequired = individualDailySavingsRequired + groupSavingsDailyRequired

  // Raw Daily Operating Capacity from unlocked spending cash
  const rawSafeToSpendDaily = Math.max(
    0,
    Math.round(effectiveOperatingCash / daysRemainingInMonth)
  )

  // Deficit & Feasibility Analysis
  const isSavingsDeficit = totalDailySavingsRequired > rawSafeToSpendDaily && rawSafeToSpendDaily > 0
  const dailySavingsDeficit = Math.max(0, totalDailySavingsRequired - rawSafeToSpendDaily)

  // Smart Living Protection:
  // If there's a deficit (savings require more than daily cash capacity),
  // NEVER force the daily spending allowance to Rp 0 (which causes starvation & broken metrics).
  // Instead, apply Balanced Split: 50% for minimum daily living, 50% for realistic daily savings allocation.
  const dynamicSafeToSpendDaily = isSavingsDeficit
    ? Math.max(0, Math.round(rawSafeToSpendDaily * 0.5))
    : Math.max(0, rawSafeToSpendDaily - totalDailySavingsRequired)

  const realisticDailySavingsAllocated = isSavingsDeficit
    ? Math.max(0, Math.round(rawSafeToSpendDaily * 0.5))
    : totalDailySavingsRequired

  const dynamicSafeToSpendWeekly = dynamicSafeToSpendDaily * 7
  const dynamicSafeToSpendMonthly = Math.max(0, effectiveOperatingCash)

  // Today's Expense
  const todayStr = now.toISOString().split('T')[0]
  const todayExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'EXPENSE' && t.transactionDate === todayStr)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [transactions, todayStr])

  // This Week's Expense
  const thisWeekExpense = useMemo(() => {
    const firstDayOfWeek = new Date(now)
    firstDayOfWeek.setDate(now.getDate() - now.getDay())
    const firstDayStr = firstDayOfWeek.toISOString().split('T')[0]

    return transactions
      .filter(
        (t) =>
          t.type === 'EXPENSE' &&
          t.transactionDate >= firstDayStr &&
          t.transactionDate <= todayStr
      )
      .reduce((sum, t) => sum + t.amount, 0)
  }, [transactions, now, todayStr])

  // Display values based on viewMode
  const currentLimit =
    viewMode === 'daily'
      ? dynamicSafeToSpendDaily
      : viewMode === 'weekly'
      ? dynamicSafeToSpendWeekly
      : dynamicSafeToSpendMonthly

  const currentSpent =
    viewMode === 'daily'
      ? todayExpense
      : viewMode === 'weekly'
      ? thisWeekExpense
      : totalExpenseAll

  const remainingCurrent = currentLimit - currentSpent
  const percentageSpent = currentLimit > 0 ? Math.round((currentSpent / currentLimit) * 100) : 0

  // Status calculation
  const statusInfo = useMemo(() => {
    if (currentLimit === 0 && effectiveOperatingCash === 0) {
      return {
        label: 'Saldo Kas Operasional Kosong',
        badge: 'neutral' as const,
        color: 'text-slate-400',
        desc: 'Catat pemasukan atau isi saldo kantong operasional agar sistem dapat menghitung jatah belanja harianmu.',
        icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
      }
    }
    if (remainingCurrent < 0) {
      return {
        label: 'Overbudget Hari Ini ⚠️',
        badge: 'expense' as const,
        color: 'text-red-400',
        desc: `Pengeluaranmu hari ini melebihi jatah harian sebesar ${formatRupiah(Math.abs(remainingCurrent))}. Rem belanja esok hari ya!`,
        icon: <Flame className="w-5 h-5 text-red-400" />,
      }
    }
    if (percentageSpent >= 80) {
      return {
        label: 'Mendekati Batas Maksimal 🟡',
        badge: 'warning' as const,
        color: 'text-amber-400',
        desc: `Kamu sudah memakai ${percentageSpent}% dari jatah belanja. Hati-hati jangan sampai boncos!`,
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      }
    }
    return {
      label: 'Sangat Aman & Terkendali 🟢',
      badge: 'brand' as const,
      color: 'text-green-400',
      desc: `Sisa jatah belanjamu masih tersisa ${formatRupiah(remainingCurrent)}. Kamu hemat dan bijak hari ini!`,
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    }
  }, [currentLimit, effectiveOperatingCash, remainingCurrent, percentageSpent])

  // Call Gemini AI for Spending Decision ("Boleh Beli Gak Ya?")
  const handleCheckSpendingItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkItemName.trim() || !Number(checkItemPrice)) return

    setCheckingItem(true)
    setItemDecision(null)

    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome,
          safeToSpendDaily: dynamicSafeToSpendDaily,
          safeToSpendMonthly: dynamicSafeToSpendMonthly,
          totalBills,
          todayExpense,
          savingsTargetRate,
          totalSavingsAccumulated,
          savingsGoals: savingsGoals.map((g) => ({
            name: g.name,
            target: g.targetAmount,
            current: g.currentAmount,
          })),
          wallets: wallets.map((w) => ({
            name: w.name,
            type: w.type,
            balance: w.balance,
            isLocked: w.isLocked,
          })),
          checkItemName: checkItemName.trim(),
          checkItemPrice: Number(checkItemPrice),
        }),
      })

      const data = await res.json()
      setItemDecision(data.advice || data.error || 'Gagal memeriksa.')
    } catch (err) {
      console.error('[daily] Error checking spending item:', err)
      setItemDecision('Terjadi kesalahan jaringan.')
    } finally {
      setCheckingItem(false)
    }
  }

  // Call Gemini AI for Custom Question
  const handleAskCustomQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customQuery.trim()) return

    setAskingQuery(true)
    setQueryAnswer(null)

    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome,
          safeToSpendDaily: dynamicSafeToSpendDaily,
          safeToSpendMonthly: dynamicSafeToSpendMonthly,
          totalBills,
          todayExpense,
          savingsTargetRate,
          totalSavingsAccumulated,
          wallets: wallets.map((w) => ({
            name: w.name,
            type: w.type,
            balance: w.balance,
            isLocked: w.isLocked,
          })),
          userQuery: customQuery.trim(),
        }),
      })

      const data = await res.json()
      setQueryAnswer(data.advice || data.error || 'Gagal memproses.')
    } catch (err) {
      console.error('[daily] Error asking custom query:', err)
      setQueryAnswer('Terjadi kesalahan jaringan.')
    } finally {
      setAskingQuery(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Jatah Belanja &amp; AI Coach
                </h1>
                <Badge variant="brand" size="sm">
                  SaveMe AI Coach
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Perhitungan dinamis berbasis kas operasional riil, proteksi tabungan beku, dan SaveMe AI Coach
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
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && wallets.length === 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-xs">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
          <div className="p-6 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-56" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
            <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Multi-Wallet Segregation Status Bar */}
          {wallets.length > 0 && (
            <div className={cn(
              'grid gap-3 p-4 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm',
              earmarkedWallets.length > 0 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
            )}>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#21263a]/60 border border-green-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                <Unlock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-green-700 dark:text-green-400 block">
                  Kas Operasional (Siap Belanja)
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {formatRupiah(totalSpendingCash)}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {spendingWallets.length} Kantong
            </span>
          </div>

          {earmarkedWallets.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="text-sm">🎯</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">
                    Kantong Bertujuan Khusus
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-blue-700 dark:text-blue-300 tabular-nums">
                    {formatRupiah(totalEarmarkedCash)}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-blue-700 dark:text-blue-400/80 font-medium">
                {earmarkedWallets.length} Kantong
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#21263a]/60 border border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                  Tabungan Beku (Terlindungi)
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-amber-700 dark:text-amber-300 tabular-nums">
                  {formatRupiah(totalLockedSavings)}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400/80 font-medium">
              {lockedWallets.length} Kantong
            </span>
          </div>
        </div>
      )}

      {/* Auto-Generated Gemini AI Coach Briefing Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/70 dark:bg-gradient-to-r dark:from-emerald-950/40 dark:via-[#1a1d27] dark:to-[#1a1d27] border border-green-500/40 shadow-sm dark:shadow-2xl flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shrink-0">
          <Bot className={cn('w-6 h-6', aiLoading && 'animate-pulse')} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                SaveMe AI Financial Coach
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              Real-time Analysis
            </span>
          </div>

          {aiLoading && !aiAdvice ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-2">
              <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin" />
              <span>SaveMe AI Coach sedang menghitung jatah belanja &amp; strategi tabunganmu hari ini...</span>
            </div>
          ) : (
            <MarkdownView content={aiAdvice || 'Sedang menyiapkan analisis harian...'} />
          )}
        </div>
      </div>

      {/* 2 Core Strategic Indicators (Target Sisihkan per Hari vs Batas Belanja Hari Ini) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Wajib Disisihkan untuk Tabungan Impian & Bersama */}
        <div className="p-5 sm:p-6 rounded-2xl bg-purple-50/80 dark:bg-gradient-to-br dark:from-purple-900/40 dark:via-purple-950/20 dark:to-[#1a1d27] border border-purple-500/30 dark:border-purple-500/40 shadow-sm dark:shadow-purple-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 dark:bg-purple-500/25 border border-purple-500/30 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                Wajib Disisihkan per Hari
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-700 dark:text-purple-200 tabular-nums tracking-tight mt-0.5">
                {formatRupiah(totalDailySavingsRequired)}
                <span className="text-xs text-purple-600/70 dark:text-purple-300/70 font-sans font-normal ml-1">/ hari</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                {savingsGoals.length} Celengan Pribadi + {groupSavings.length} Celengan Bersama aktif.
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Sisa Uang Bebas yang Boleh Dibelanjakan Hari Ini */}
        <div className="p-5 sm:p-6 rounded-2xl bg-green-50/80 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:via-emerald-950/20 dark:to-[#1a1d27] border border-green-500/30 dark:border-emerald-500/40 shadow-sm dark:shadow-emerald-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 dark:bg-emerald-500/25 border border-green-500/30 text-green-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-emerald-300 block">
                Batas Aman Belanja Hari Ini
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                {formatRupiah(dynamicSafeToSpendDaily)}
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans font-normal ml-1">/ hari</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                {isSavingsDeficit
                  ? '🛡️ Diproteksi (50% dari kapasitas kas harian dialokasikan untuk jatah makan).'
                  : `Bersih setelah dikunci untuk seluruh kewajiban tabungan (${daysRemainingInMonth} hari tersisa).`}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-green-500/10 dark:bg-emerald-500/20 text-green-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <WalletIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 🚨 DEFICIT & FEASIBILITY RESOLUTION ENGINE WIDGET 🚨 */}
      {isSavingsDeficit && (
        <div className="p-5 sm:p-6 rounded-3xl bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800/60 shadow-lg flex flex-col gap-4 animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Early Warning &amp; Deficit Resolution
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Target Tabungan Melebihi Kapasitas Kas Harian
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-400/40">
              Defisit: {formatRupiah(dailySavingsDeficit)}/hari
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Total komitmen tabunganmu (<strong>{formatRupiah(totalDailySavingsRequired)}/hari</strong>) melebihi kapasitas kas operasionalmu yang tersisa (<strong>{formatRupiah(rawSafeToSpendDaily)}/hari</strong>).
          </p>

          {/* 50:50 Balanced Split Protection Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1d27] border border-rose-200 dark:border-rose-900/50 space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Proteksi Biaya Hidup (Smart Living Protection Diberlakukan)
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Daripada membuat jatah belanjamu Rp 0 (yang membuatmu kelaparan), sistem otomatis mengamankan <strong>50% kas harian ({formatRupiah(dynamicSafeToSpendDaily)}/hari)</strong> untuk kebutuhan makan/belanja hidupmu, dan <strong>50% ({formatRupiah(dynamicSafeToSpendDaily)}/hari)</strong> dialokasikan maksimal ke celengan.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-[#2d3348] text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Jatah Hidup Terlindungi</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatRupiah(dynamicSafeToSpendDaily)}/hari
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nabung Realistis</span>
                <span className="font-bold font-mono text-purple-600 dark:text-purple-400 text-sm">
                  {formatRupiah(dynamicSafeToSpendDaily)}/hari
                </span>
              </div>
            </div>
          </div>

          {/* How to Fix Recommendations */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              💡 Solusi Konkret Agar Target Tabunganmu Tercapai:
            </span>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Perpanjang Deadline Celengan</strong>: Buka menu Celengan dan ubah deadline menjadi lebih longgar agar cicilan harian turun sesuai kapasitas kasmu.
              </li>
              <li>
                <strong>Tambah Saldo Kas Operasional</strong>: Isi dompet kas belanjamu jika ada pendapatan baru.
              </li>
              <li>
                <strong>Sesuaikan Porsi Celengan Bersama</strong>: Minta host untuk menurunkan persentase bagianmu.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 🛡️ Ambang Batas Cerdas & Perlindungan Tabungan Breakdown */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-blue-500/30 dark:border-blue-400/30 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ambang Batas Cerdas (Smart Spending Threshold)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">
            Anti-Boncos Guard
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          Sistem otomatis mengamankan porsi tabungan dari kasmu, sehingga jatah belanjamu adalah uang murni yang aman dihabiskan tanpa mengorbankan impian pribadi &amp; bersama.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/50 dark:border-[#2d3348]">
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#1a1d27]/80 border border-slate-200 dark:border-[#2d3348] flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Celengan Pribadi ({savingsGoals.length})
            </span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-purple-600 dark:text-purple-400">
              {formatRupiah(individualDailySavingsRequired)}
              <span className="text-xs font-normal text-slate-400">/hari</span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#1a1d27]/80 border border-slate-200 dark:border-[#2d3348] flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Celengan Bersama ({groupSavings.length})
            </span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400">
              {formatRupiah(groupSavingsDailyRequired)}
              <span className="text-xs font-normal text-slate-400">/hari</span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-1">
              Batas Belanja Murni Aman
            </span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
              {formatRupiah(dynamicSafeToSpendDaily)}
              <span className="text-xs font-normal text-emerald-600/80">/hari</span>
            </span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Filter Tabs: Daily vs Weekly vs Monthly */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-100 dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] self-start overflow-x-auto max-w-full no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              viewMode === 'daily'
                ? 'bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-green-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm dark:shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Batas Hari Ini ({formatRupiah(dynamicSafeToSpendDaily)})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              viewMode === 'weekly'
                ? 'bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-green-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm dark:shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batas Minggu Ini ({formatRupiah(dynamicSafeToSpendWeekly)})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              viewMode === 'monthly'
                ? 'bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-green-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm dark:shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <WalletIcon className="w-3.5 h-3.5" />
            <span>Sisa Kas Operasional ({formatRupiah(effectiveOperatingCash)})</span>
          </button>
        </div>
      </div>

      {/* Main Budget Card with Live Meter */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-gradient-to-br dark:from-[#1e2333] dark:via-[#1a1d27] dark:to-[#161822] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-2xl relative overflow-hidden flex flex-col gap-6 text-slate-900 dark:text-white">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-green-600 dark:text-emerald-400 shrink-0 shadow-inner">
              {statusInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {viewMode === 'daily'
                    ? 'Sisa Jatah Belanja Hari Ini'
                    : viewMode === 'weekly'
                    ? 'Sisa Jatah Belanja Minggu Ini'
                    : 'Sisa Uang Kas Bebas'}
                </span>
                <Badge variant={statusInfo.badge} size="sm">
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-3xl sm:text-5xl font-black font-mono tracking-tight tabular-nums',
                    remainingCurrent >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {formatRupiah(remainingCurrent)}
                </span>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans">
                  tersisa dari batas {formatRupiah(currentLimit)}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-lg leading-relaxed">
                {statusInfo.desc}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gradient-to-br dark:from-[#21263a] dark:to-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex flex-col items-start md:items-end justify-center shrink-0 gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Terpakai:</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-purple-700 dark:text-purple-300">
              {formatRupiah(currentSpent)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({percentageSpent}% terpakai)
            </span>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="relative z-10 flex flex-col gap-2">
          <div className="w-full h-3 bg-slate-100 dark:bg-[#131620] rounded-full overflow-hidden border border-slate-200 dark:border-[#2d3348]/60 p-0.5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                percentageSpent > 100
                  ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                  : percentageSpent >= 80
                  ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                  : 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_12px_#22c55e]'
              )}
              style={{ width: `${Math.min(100, Math.max(3, percentageSpent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2 Interactive AI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature 1: Spending Decision Checker ("Boleh Beli Gak Ya?") */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#1e2235] dark:via-[#1a1d27] dark:to-[#161822] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Boleh Beli Gak Ya? (AI Spending Checker)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Punya rencana belanja? Tanyakan ke SaveMe AI Coach untuk memeriksa apakah barang tersebut aman dibeli hari ini tanpa merusak target tabungan impianmu.
            </p>

            <form onSubmit={handleCheckSpendingItem} className="flex flex-col gap-3">
              <FormField label="Nama Barang / Rencana Belanja" required>
                <Input
                  placeholder="Contoh: Sepatu Sneakers Nike / Kopi Kenangan"
                  value={checkItemName}
                  onChange={(e) => setCheckItemName(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Perkiraan Harga (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 450000"
                  value={checkItemPrice}
                  onChange={(e) => setCheckItemPrice(e.target.value)}
                  required
                />
              </FormField>

              <Button
                type="submit"
                variant="glow"
                size="md"
                loading={checkingItem}
                className="mt-1"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Cek Keputusan Belanja dengan AI
              </Button>
            </form>
          </div>

          {itemDecision && (
            <div className="mt-4 p-4 rounded-xl bg-purple-50/50 dark:bg-[#21263a] border border-purple-200 dark:border-purple-500/30 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in leading-relaxed">
              <MarkdownView content={itemDecision} />
            </div>
          )}
        </div>

        {/* Feature 2: Custom AI Question Box */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#1e2235] dark:via-[#1a1d27] dark:to-[#161822] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Konsultasi Finansial dengan AI Coach
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Tanyakan strategi menabung, cara melunasi cicilan lebih cepat, atau tips hemat harian kepada asisten keuangan pribadimu.
            </p>

            <form onSubmit={handleAskCustomQuery} className="flex flex-col gap-3">
              <FormField label="Pertanyaan Keuanganmu" required>
                <textarea
                  rows={3}
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Contoh: Bagaimana cara terbaik membagi sisa saldo agar bisa beli laptop dalam 3 bulan?"
                  className="w-full bg-white dark:bg-[#21263a] text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-xs sm:text-sm border border-slate-200 dark:border-[#2d3348] focus:border-green-500 focus:outline-none resize-none"
                  required
                />
              </FormField>

              <Button
                type="submit"
                variant="secondary"
                size="md"
                loading={askingQuery}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Kirim Pertanyaan
              </Button>
            </form>
          </div>

          {queryAnswer && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#21263a] border border-green-500/30 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in leading-relaxed max-h-60 overflow-y-auto">
              <MarkdownView content={queryAnswer} />
            </div>
          )}
          </div>
        </div>
      </>
    )}
    </div>
  )
}
