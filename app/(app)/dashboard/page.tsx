'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { transactionService, CreateTransactionDto } from '@/lib/services/transaction.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { recurringService } from '@/lib/services/recurring.firebase'
import { savingsService } from '@/lib/services/savings.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { OnboardingWizard } from '@/components/organisms/OnboardingWizard'
import { GettingStartedWidget } from '@/components/organisms/GettingStartedWidget'
import { RecurringBillsCard } from '@/components/organisms/RecurringBillsCard'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { ReceiptScannerModal } from '@/components/organisms/ReceiptScannerModal'
import {
  Wallet as WalletIcon,
  PlusCircle,
  PiggyBank,
  Trash2,
  Calendar,
  X,
  Sparkles,
  Tag,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  Target,
  ShieldCheck,
  ChevronRight,
  Camera,
  Lock,
  Unlock,
} from 'lucide-react'
import type { Category, DashboardSummary, RecurringBill, SavingsGoal, Wallet, ReceiptScanResult } from '@/types'
import { cn } from '@/lib/utils/cn'

type PeriodFilter = 'today' | 'week' | 'month' | 'all'

export default function DashboardPage() {
  const { user, userProfile, refreshProfile } = useAuth()

  const [summary, setSummary] = useState<DashboardSummary>({
    balance: 0,
    totalIncome: 0,
    totalExpense: 0,
    savingsRate: 0,
    transactions: [],
    categoryBreakdown: [],
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('month')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Form State for Add Transaction
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        // 1. Process any due recurring bills automatically
        await recurringService.processDueRecurringBills(user.uid)

        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        let from: string | undefined
        let to: string | undefined

        if (activePeriod === 'today') {
          from = todayStr
          to = todayStr
        } else if (activePeriod === 'week') {
          const firstDayOfWeek = new Date(now)
          firstDayOfWeek.setDate(now.getDate() - now.getDay())
          from = firstDayOfWeek.toISOString().split('T')[0]
          to = todayStr
        } else if (activePeriod === 'month') {
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          from = firstDayOfMonth.toISOString().split('T')[0]
          to = todayStr
        }

        const [data, cats, bills, goals, userWallets] = await Promise.all([
          transactionService.getDashboardSummary(user.uid, from, to),
          categoryService.getCategories(),
          recurringService.getUserRecurringBills(user.uid),
          savingsService.getUserGoals(user.uid),
          walletService.getUserWallets(user.uid),
        ])

        if (isMounted) {
          setSummary(data)
          setCategories(cats)
          setRecurringBills(bills)
          setSavingsGoals(goals)
          setWallets(userWallets)
          if (cats.length > 0 && !categoryId) {
            setCategoryId(cats[0].id)
          }
          if (userWallets.length > 0 && !walletId) {
            setWalletId(userWallets[0].id)
          }
        }
      } catch (error) {
        console.error('[dashboard] Error loading data:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [user?.uid, activePeriod, refreshTrigger, categoryId, walletId])

  // Handle Apply Scan Result from AI Scanner
  const handleApplyScanResult = (result: ReceiptScanResult) => {
    setType('EXPENSE')
    setAmount(result.totalAmount.toString())
    setDescription(result.merchantName)
    setTransactionDate(result.transactionDate)

    const matchedCategory = categories.find(
      (c) =>
        c.id.toLowerCase() === result.suggestedCategoryId.toLowerCase() ||
        c.name.toLowerCase().includes(result.suggestedCategoryName.toLowerCase())
    )
    if (matchedCategory) {
      setCategoryId(matchedCategory.id)
    }

    setFormError(null)
    setIsModalOpen(true)
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setFormError('Nominal transaksi harus lebih besar dari 0')
      return
    }

    const selectedCategory = categories.find((c) => c.id === categoryId) || {
      id: 'other',
      name: 'Other',
      icon: '📦',
      type: 'BOTH' as const,
    }

    const selectedWallet = wallets.find((w) => w.id === walletId)

    if (!user?.uid) return

    setSubmitting(true)
    try {
      const payload: CreateTransactionDto = {
        type,
        amount: numAmount,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        description: description || selectedCategory.name,
        transactionDate,
        walletId: selectedWallet?.id,
        walletName: selectedWallet?.name,
      }

      await transactionService.create(user.uid, payload)

      // Adjust wallet balance if wallet is selected
      if (selectedWallet) {
        const delta = type === 'INCOME' ? numAmount : -numAmount
        await walletService.adjustWalletBalance(user.uid, selectedWallet.id, delta)
      }

      // Reset form & close modal
      setAmount('')
      setDescription('')
      setIsModalOpen(false)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err: unknown) {
      console.error('[dashboard] Error creating transaction:', err)
      const errorObj = err as { message?: string }
      setFormError(errorObj.message || 'Gagal menyimpan transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Confirmation Modal State
  const [txToDelete, setTxToDelete] = useState<string | null>(null)
  const [isDeletingTx, setIsDeletingTx] = useState(false)

  const handleConfirmDelete = async () => {
    if (!user?.uid || !txToDelete) return
    setIsDeletingTx(true)

    try {
      const tx = summary.transactions.find((t) => t.id === txToDelete)
      if (tx && tx.walletId) {
        const delta = tx.type === 'INCOME' ? -tx.amount : tx.amount
        await walletService.adjustWalletBalance(user.uid, tx.walletId, delta)
      }

      await transactionService.delete(user.uid, txToDelete)
      setTxToDelete(null)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      console.error('[dashboard] Error deleting transaction:', err)
    } finally {
      setIsDeletingTx(false)
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Multi-Wallet Breakdown & Segregation
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])

  const totalSpendingBalance = useMemo(
    () => spendingWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [spendingWallets]
  )

  const totalLockedBalance = useMemo(
    () => lockedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [lockedWallets]
  )

  const totalSavingsInGoals = useMemo(
    () => savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0),
    [savingsGoals]
  )

  // Liquid Operating Cash for Daily Spending (ONLY Unlocked Wallets)
  const effectiveOperatingCash = wallets.length > 0 ? totalSpendingBalance : summary.balance

  // Total Net Worth (Operating Cash + Locked Savings + Goals)
  const totalNetWorth =
    (wallets.length > 0 ? totalSpendingBalance + totalLockedBalance : summary.balance) +
    totalSavingsInGoals

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

  // Daily Savings Required across all goals
  const totalDailySavingsRequired = useMemo(() => {
    return savingsGoals.reduce((sum, g) => {
      if (!g.targetDate) return sum
      const targetD = new Date(g.targetDate)
      const diffDays = Math.max(1, Math.ceil((targetD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingTarget = Math.max(0, g.targetAmount - g.currentAmount)
      return sum + Math.round(remainingTarget / diffDays)
    }, 0)
  }, [savingsGoals, now])

  // Dynamic Real-time Safe-to-Spend Daily (STRICTLY FROM OPERATING CASH)
  const dynamicSafeToSpendDaily = Math.max(
    0,
    Math.round((effectiveOperatingCash - unpaidBillsThisMonth) / daysRemainingInMonth)
  )

  const shouldShowOnboarding =
    userProfile !== null &&
    userProfile.hasCompletedOnboarding === false &&
    !isOnboardingModalOpen

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4">
      {/* Auto-Trigger Onboarding Wizard for First Time Users or Atur Gaji */}
      {(shouldShowOnboarding || isOnboardingModalOpen) && user && (
        <OnboardingWizard
          userId={user.uid}
          userName={userProfile?.name}
          initialData={{
            initialBalance: userProfile?.initialBalance,
            monthlyIncome: userProfile?.monthlyIncome,
            savingsTarget: userProfile?.savingsTarget,
          }}
          onComplete={async () => {
            setIsOnboardingModalOpen(false)
            await refreshProfile()
            setRefreshTrigger((p) => p + 1)
          }}
          onClose={isOnboardingModalOpen ? () => setIsOnboardingModalOpen(false) : undefined}
        />
      )}

      {/* Top Header Greeting & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              Halo, {userProfile?.name?.split(' ')[0] || 'Teman SaveMe'}! 👋
            </h1>
            <Badge variant="brand" size="sm">
              {userProfile?.role || 'USER'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Berikut perhitungan terpadu dan analisis keuangan pribadimu secara real-time.
          </p>
        </div>

        {/* Responsive Header Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOnboardingModalOpen(true)}
            title="Atur ulang profil finansial awal"
            className="text-xs px-2.5 sm:px-3"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            Atur Gaji
          </Button>

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
            onClick={() => setIsScanModalOpen(true)}
            className="text-xs sm:text-sm text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
            leftIcon={<Camera className="w-4 h-4 text-purple-400" />}
          >
            Scan Struk AI
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs sm:text-sm px-3 sm:px-4 ml-auto sm:ml-0"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Catat Transaksi
          </Button>
        </div>
      </div>

      {/* Getting Started Guide Checklist */}
      <GettingStartedWidget
        hasOnboardingCompleted={Boolean(userProfile?.hasCompletedOnboarding)}
        hasTransactions={summary.transactions.length > 0}
        hasSavingsRate={summary.savingsRate >= 20}
        onAddTransactionClick={() => setIsModalOpen(true)}
      />

      {/* 2 Smart Dynamic Indicators (Safe-to-Spend Today & Daily Savings Required) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dynamic Safe-to-Spend Today */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-[#1a1d27] to-[#1a1d27] border border-green-500/30 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-400 flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-green-400">
                  Batas Aman Belanja Hari Ini
                </span>
                <span className="text-[10px] text-slate-400">({daysRemainingInMonth} hari sisa)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums tracking-tight mt-0.5">
                {formatRupiah(dynamicSafeToSpendDaily)}
                <span className="text-xs text-slate-400 font-sans font-normal ml-1">/ hari</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Dihitung dari saldo dompet kas dibagi {daysRemainingInMonth} hari sisa bulan berjalan.
              </p>
            </div>
          </div>
          <Link href="/daily" className="p-2 rounded-xl bg-[#21263a] hover:bg-[#2d3348] text-slate-300 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Daily Required Savings for Goals */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/15 via-[#1a1d27] to-[#1a1d27] border border-purple-500/30 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Wajib Disisihkan per Hari
                </span>
                <span className="text-[10px] text-slate-400">({savingsGoals.length} Celengan)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-300 tabular-nums tracking-tight mt-0.5">
                {formatRupiah(totalDailySavingsRequired)}
                <span className="text-xs text-slate-400 font-sans font-normal ml-1">/ hari</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Nominal yang perlu kamu tabung agar seluruh target impianmu tercapai tepat waktu.
              </p>
            </div>
          </div>
          <Link href="/savings" className="p-2 rounded-xl bg-[#21263a] hover:bg-[#2d3348] text-slate-300 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] overflow-x-auto max-w-full no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setActivePeriod('today')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              activePeriod === 'today'
                ? 'bg-green-500 text-slate-950 font-bold shadow-lg shadow-green-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setActivePeriod('week')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              activePeriod === 'week'
                ? 'bg-green-500 text-slate-950 font-bold shadow-lg shadow-green-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Minggu Ini
          </button>
          <button
            type="button"
            onClick={() => setActivePeriod('month')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              activePeriod === 'month'
                ? 'bg-green-500 text-slate-950 font-bold shadow-lg shadow-green-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => setActivePeriod('all')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              activePeriod === 'all'
                ? 'bg-green-500 text-slate-950 font-bold shadow-lg shadow-green-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Semua Riwayat
          </button>
        </div>
      </div>

      {/* 3 Main Interconnected Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Kekayaan Bersih (Net Worth) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#1e2333] to-[#1a1d27] border border-[#2d3348] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Total Kekayaan Bersih
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums tracking-tight mb-1 sm:mb-2">
            {formatRupiah(totalNetWorth)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Seluruh Kantong + Celengan</span>
          </div>
        </div>

        {/* Kas Operasional (Liquid Spending Cash) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-green-500/30 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-400 flex items-center gap-1">
              <Unlock className="w-3.5 h-3.5" /> Kas Operasional (Belanja)
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
              <WalletIcon className="w-4 h-4" />
            </div>
          </div>
          <div
            className={cn(
              'text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight mb-1 sm:mb-2',
              effectiveOperatingCash >= 0 ? 'text-green-400' : 'text-red-400'
            )}
          >
            {formatRupiah(effectiveOperatingCash)}
          </div>
          <span className="text-xs text-slate-400">
            {spendingWallets.length > 0 ? `Uang cair dari ${spendingWallets.length} kantong aktif` : 'Uang cair siap dibelanjakan'}
          </span>
        </div>

        {/* Tabungan Beku & Celengan Impian */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-amber-500/30 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Tabungan Beku & Celengan
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300 tabular-nums tracking-tight mb-1 sm:mb-2">
            {formatRupiah(totalLockedBalance + totalSavingsInGoals)}
          </div>
          <span className="text-xs text-slate-400">
            {lockedWallets.length} Kantong Beku + {savingsGoals.length} Celengan
          </span>
        </div>
      </div>

      {/* Quick Glance: Kantong & Rekening Widget */}
      {wallets.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d3348]">
            <div className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Rincian Kantong Keuangan & Rekening
                </h3>
                <span className="text-[11px] text-slate-400">
                  Saldo tersebar di {wallets.length} kantong aktif
                </span>
              </div>
            </div>
            <Link
              href="/wallets"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Kelola Kantong</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {wallets.map((w) => {
              const isLockedWallet = Boolean(w.isLocked)
              return (
                <div
                  key={w.id}
                  className={cn(
                    'p-3.5 rounded-xl border flex items-center justify-between transition-all bg-[#21263a]/60',
                    isLockedWallet ? 'border-amber-500/30' : 'border-[#2d3348]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{w.icon || '💳'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate max-w-[110px]">
                          {w.name}
                        </span>
                        {isLockedWallet ? (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-1 rounded">
                            🔒 Beku
                          </span>
                        ) : (
                          <span className="text-[9px] bg-green-500/20 text-green-400 font-bold px-1 rounded">
                            🟢 Kas
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-200 block mt-0.5">
                        {formatRupiah(w.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mini Celengan Impian Preview Widget */}
      {savingsGoals.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d3348]">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Progres Celengan Impian Aktif
              </h3>
            </div>
            <Link href="/savings" className="text-xs text-green-400 hover:underline flex items-center gap-1 font-semibold">
              <span>Kelola Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {savingsGoals.slice(0, 3).map((goal) => {
              const pct =
                goal.targetAmount > 0
                  ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                  : 0

              return (
                <div key={goal.id} className="p-3.5 rounded-xl bg-[#21263a]/60 border border-[#2d3348] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{goal.icon || '🎯'}</span>
                        <span className="text-xs font-bold text-white truncate">{goal.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">{pct}%</span>
                    </div>

                    <div className="w-full h-2 bg-[#131620] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{formatRupiah(goal.currentAmount)}</span>
                    <span>Target: {formatRupiah(goal.targetAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recurring Bills & Subscriptions Card */}
      <RecurringBillsCard
        userId={user?.uid || ''}
        bills={recurringBills}
        categories={categories}
        onUpdated={() => setRefreshTrigger((p) => p + 1)}
      />

      {/* Breakdown per Kategori & Feed Transaksi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (5 Cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-400" />
                <h3 className="text-base font-bold text-white">Alokasi Pengeluaran</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {summary.categoryBreakdown.length} Kategori
              </span>
            </div>

            {summary.categoryBreakdown.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                Belum ada pengeluaran pada periode ini.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {summary.categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-200 flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="font-medium truncate max-w-[120px] sm:max-w-none">{cat.name}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300 tabular-nums font-semibold">
                          {formatRupiah(cat.amount)}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#21263a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(4, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings Ratio Indicator */}
          <div className="mt-6 pt-4 border-t border-[#2d3348] flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4 text-green-400" />
              <span>Rasio Tabungan:</span>
            </span>
            <span className="font-bold text-green-400 font-mono text-sm">
              {summary.savingsRate}%
            </span>
          </div>
        </div>

        {/* Live Transaction Table / List (7 Cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-400" />
              <h3 className="text-base font-bold text-white">
                Daftar Transaksi ({summary.transactions.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500">Urut terbaru</span>
          </div>

          {summary.transactions.length === 0 ? (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">📝</div>
              <h4 className="text-sm font-semibold text-slate-300 mb-1">
                Belum ada transaksi di periode ini
              </h4>
              <p className="text-xs text-slate-500 mb-4 max-w-xs">
                Klik tombol di bawah untuk mencatat pemasukan atau pengeluaran pertamamu.
              </p>
              <Button
                variant="glow"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Catat Sekarang
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {summary.transactions.map((tx) => {
                const isIncome = tx.type === 'INCOME'
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-[#21263a]/60 hover:bg-[#21263a] border border-[#2d3348]/70 transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-center text-base sm:text-lg shrink-0 shadow-inner">
                        {tx.categoryIcon || '📦'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">
                            {tx.description}
                          </span>
                          <Badge variant={isIncome ? 'income' : 'expense'} size="sm">
                            {tx.categoryName}
                          </Badge>
                        </div>
                        <span className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{tx.transactionDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
                      <span
                        className={cn(
                          'text-xs sm:text-base font-bold font-mono tabular-nums tracking-tight',
                          isIncome ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => setTxToDelete(tx.id)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-[#1a1d27] transition-all cursor-pointer"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal for Deleting Transaction */}
      <ConfirmModal
        isOpen={Boolean(txToDelete)}
        title="Hapus Transaksi?"
        description="Apakah Anda yakin ingin menghapus catatan transaksi ini? Data yang dihapus tidak dapat dipulihkan."
        confirmText="Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
        loading={isDeletingTx}
        onConfirm={handleConfirmDelete}
        onClose={() => setTxToDelete(null)}
      />

      {/* Modal Add Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1d27] border border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Catat Transaksi Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#21263a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="flex flex-col gap-3.5 sm:gap-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#21263a] border border-[#2d3348]">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={cn(
                    'py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    type === 'EXPENSE'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={cn(
                    'py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    type === 'INCOME'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount */}
              <FormField label="Nominal (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </FormField>

              {/* Category Selector */}
              <FormField label="Kategori" required>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border border-[#2d3348]/40 rounded-xl bg-[#131620]/50">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer',
                        categoryId === cat.id
                          ? 'bg-green-500/20 border-green-500/50 text-white font-bold'
                          : 'bg-[#21263a] border-[#2d3348] text-slate-300 hover:border-slate-500'
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="truncate w-full text-center text-[10px]">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Wallet Selector */}
              {wallets.length > 0 && (
                <FormField label="Kantong / Sumber Dana">
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full bg-[#21263a] text-slate-100 rounded-xl px-4 py-3 text-xs sm:text-sm border border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name} ({formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              {/* Description */}
              <FormField label="Keterangan / Catatan">
                <Input
                  placeholder="Contoh: Makan siang nasi padang"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>

              {/* Date */}
              <FormField label="Tanggal Transaksi" required>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d3348] mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  loading={submitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApplyResult={handleApplyScanResult}
      />
    </div>
  )
}
