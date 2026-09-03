'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { transactionService, CreateTransactionDto } from '@/lib/services/transaction.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { recurringService } from '@/lib/services/recurring.firebase'
import { savingsService } from '@/lib/services/savings.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { quickTemplateService } from '@/lib/services/quick-template.firebase'
import { groupSavingsService } from '@/lib/services/group-savings.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { Skeleton } from '@/components/atoms/Skeleton'
import { normalizeDateToYYYYMMDD } from '@/lib/utils/date'
import { OnboardingWizard } from '@/components/organisms/OnboardingWizard'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { ReceiptScannerModal } from '@/components/organisms/ReceiptScannerModal'
import { NotificationPromptModal } from '@/components/organisms/NotificationPromptModal'
import { notificationService } from '@/lib/services/notification.firebase'
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
  Compass,
  Target,
  ShieldCheck,
  ChevronRight,
  Camera,
  Lock,
  Unlock,
  Zap,
  DollarSign,
  Bell,
  AlertTriangle,
} from 'lucide-react'
import type {
  Category,
  DashboardSummary,
  RecurringBill,
  SavingsGoal,
  Wallet,
  ReceiptScanResult,
  QuickTemplate,
  GroupSavings,
  GroupSavingsMember,
} from '@/types'
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
  const [templates, setTemplates] = useState<QuickTemplate[]>([])
  const [groupSavings, setGroupSavings] = useState<{
    group: GroupSavings
    member: GroupSavingsMember
    allMembers: GroupSavingsMember[]
  }[]>([])

  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('month')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false)
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false)
  const [hasNotificationEnabled, setHasNotificationEnabled] = useState(false)
  const [isNotifBannerDismissed, setIsNotifBannerDismissed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Dual-Perspective Bills Preference (Synced with /profile & localStorage)
  const [deductBills, setDeductBills] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('saveme_deduct_bills_daily')
      if (saved !== null) return saved === 'true'
    }
    return userProfile?.deductBillsFromDaily ?? true
  })

  useEffect(() => {
    if (userProfile?.deductBillsFromDaily !== undefined) {
      setDeductBills(userProfile.deductBillsFromDaily)
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('saveme_deduct_bills_daily')
      if (saved !== null) {
        setDeductBills(saved === 'true')
      }
    }
  }, [userProfile?.deductBillsFromDaily])

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

  // Delete Transaction Modal State
  const [txToDelete, setTxToDelete] = useState<string | null>(null)
  const [isDeletingTx, setIsDeletingTx] = useState(false)

  // Fetch Dashboard Data
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        // Determine date range for summary
        let dateFrom: string | undefined = undefined
        const today = new Date()
        if (activePeriod === 'today') {
          dateFrom = today.toISOString().split('T')[0]
        } else if (activePeriod === 'week') {
          const weekAgo = new Date(today)
          weekAgo.setDate(today.getDate() - 7)
          dateFrom = weekAgo.toISOString().split('T')[0]
        } else if (activePeriod === 'month') {
          dateFrom = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-01`
        }

        const [
          summaryData,
          categoryList,
          billsList,
          goalsList,
          walletsList,
          templatesList,
          notifSettings,
          groupsList,
        ] = await Promise.all([
          transactionService.getDashboardSummary(user.uid, dateFrom),
          categoryService.getCategories(),
          recurringService.getUserRecurringBills(user.uid),
          savingsService.getUserGoals(user.uid),
          walletService.getUserWallets(user.uid),
          quickTemplateService.getUserTemplates(user.uid),
          notificationService.getSettings(user.uid),
          groupSavingsService.getUserGroups(user.uid),
        ])

        if (isMounted) {
          setSummary(summaryData)
          setCategories(categoryList)
          setRecurringBills(billsList)
          setSavingsGoals(goalsList)
          setWallets(walletsList)
          setTemplates(templatesList)
          setHasNotificationEnabled(Boolean(notifSettings?.enabled))
          setGroupSavings(groupsList)

          // Set default Category & Wallet for Add Transaction Form
          if (categoryList.length > 0 && !categoryId) {
            setCategoryId(categoryList[0].id)
          }
          if (walletsList.length > 0 && !walletId) {
            setWalletId(walletsList[0].id)
          }

          // Trigger onboarding if brand new user
          if (userProfile && !userProfile.hasCompletedOnboarding && summaryData.transactions.length === 0) {
            setIsOnboardingModalOpen(true)
          }
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching data:', err)
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
  }, [user?.uid, activePeriod, refreshTrigger, userProfile])

  // Multi-wallet segregated calculations
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])

  const totalOperatingCash = useMemo(
    () => spendingWallets.reduce((acc, w) => acc + (w.balance || 0), 0),
    [spendingWallets]
  )

  const totalLockedBalance = useMemo(
    () => lockedWallets.reduce((acc, w) => acc + (w.balance || 0), 0),
    [lockedWallets]
  )

  const totalSavingsInGoals = useMemo(
    () => savingsGoals.reduce((acc, g) => acc + (g.currentAmount || 0), 0),
    [savingsGoals]
  )

  const totalNetWorth = useMemo(() => {
    return totalOperatingCash + totalLockedBalance + totalSavingsInGoals
  }, [totalOperatingCash, totalLockedBalance, totalSavingsInGoals])

  const effectiveOperatingCash = totalOperatingCash

  // Safe-to-Spend Daily Allowance Calculation
  const daysRemainingInMonth = useMemo(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return Math.max(1, lastDay - now.getDate() + 1)
  }, [])

  const unpaidBillsThisMonth = useMemo(() => {
    const now = new Date()
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`
    return recurringBills
      .filter((b) => b.lastProcessedMonth !== currentMonthStr)
      .reduce((sum, b) => sum + b.amount, 0)
  }, [recurringBills])

  // Daily Savings Required for Individual Goals (Celengan Impian)
  const individualDailySavingsRequired = useMemo(() => {
    const now = new Date()
    return savingsGoals.reduce((sum, g) => {
      if (!g.targetDate) return sum
      const targetD = new Date(g.targetDate)
      const diffDays = Math.max(1, Math.ceil((targetD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingTarget = Math.max(0, g.targetAmount - g.currentAmount)
      return sum + Math.round(remainingTarget / diffDays)
    }, 0)
  }, [savingsGoals])

  // Daily Savings Required for Group Savings (Celengan Bersama)
  const groupSavingsDailyRequired = useMemo(() => {
    const now = new Date()
    return groupSavings.reduce((sum, g) => {
      if (!g.group.targetDate) return sum
      const targetD = new Date(g.group.targetDate)
      const diffDays = Math.max(1, Math.ceil((targetD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingTarget = Math.max(0, g.member.myTarget - g.member.myContributed)
      return sum + Math.round(remainingTarget / diffDays)
    }, 0)
  }, [groupSavings])

  // Combined Daily Savings Commitment (Pribadi + Bersama)
  const totalDailySavingsRequired = individualDailySavingsRequired + groupSavingsDailyRequired

  // Kas operasional setelah disisihkan untuk tagihan/cicilan yang belum lunas
  const operatingCashAfterBills = Math.max(0, effectiveOperatingCash - unpaidBillsThisMonth)

  // Kas operasional aktif sesuai preferensi user
  const activeOperatingCashBasis = deductBills && unpaidBillsThisMonth > 0
    ? operatingCashAfterBills
    : effectiveOperatingCash

  // Raw Daily Operating Capacity
  const rawSafeToSpendDaily = Math.max(
    0,
    Math.round(activeOperatingCashBasis / daysRemainingInMonth)
  )

  // Deficit & Feasibility Analysis
  const isSavingsDeficit = totalDailySavingsRequired > rawSafeToSpendDaily && rawSafeToSpendDaily > 0

  // Daily Limit: Net of both bills (if deducted) and daily savings commitment (consistent with /daily)!
  const dailyLimit = useMemo(() => {
    return isSavingsDeficit
      ? Math.max(0, Math.round(rawSafeToSpendDaily * 0.5))
      : Math.max(0, rawSafeToSpendDaily - totalDailySavingsRequired)
  }, [isSavingsDeficit, rawSafeToSpendDaily, totalDailySavingsRequired])

  const rawDailyWithoutBills = Math.max(0, Math.round(effectiveOperatingCash / daysRemainingInMonth))
  const dailyLimitWithoutBills = useMemo(() => {
    return totalDailySavingsRequired > rawDailyWithoutBills && rawDailyWithoutBills > 0
      ? Math.max(0, Math.round(rawDailyWithoutBills * 0.5))
      : Math.max(0, rawDailyWithoutBills - totalDailySavingsRequired)
  }, [rawDailyWithoutBills, totalDailySavingsRequired])

  const rawDailyWithBills = Math.max(0, Math.round(operatingCashAfterBills / daysRemainingInMonth))
  const dailyLimitWithBills = useMemo(() => {
    return totalDailySavingsRequired > rawDailyWithBills && rawDailyWithBills > 0
      ? Math.max(0, Math.round(rawDailyWithBills * 0.5))
      : Math.max(0, rawDailyWithBills - totalDailySavingsRequired)
  }, [rawDailyWithBills, totalDailySavingsRequired])

  const todayExpense = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return summary.transactions
      .filter((t) => t.type === 'EXPENSE' && t.transactionDate === todayStr)
      .reduce((acc, t) => acc + t.amount, 0)
  }, [summary.transactions])

  const todayRemainingAllowance = Math.max(0, dailyLimit - todayExpense)
  const isOverToday = todayExpense > dailyLimit
  const todayExcessAmount = isOverToday ? todayExpense - dailyLimit : 0
  const isUsedToday = todayExpense > 0

  // Payday & Student Allowance info
  const userIncomeType = userProfile?.incomeType || 'SALARIED'
  const effectivePayday = userProfile?.paydayDay || 25
  const isEndOfMonth = Boolean(userProfile?.isEndOfMonthPayday)
  const isStartOfMonth = effectivePayday === 1

  const isPaydayToday = useMemo(() => {
    if (userIncomeType !== 'SALARIED') return false
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    if (isEndOfMonth) return now.getDate() === lastDay
    if (isStartOfMonth) return now.getDate() === 1
    return now.getDate() === effectivePayday
  }, [userIncomeType, isEndOfMonth, isStartOfMonth, effectivePayday])

  const daysUntilPayday = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDate()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const targetDay = isEndOfMonth ? lastDay : isStartOfMonth ? 1 : effectivePayday

    if (currentDay === targetDay) return 0
    if (currentDay < targetDay) return targetDay - currentDay
    return lastDay - currentDay + targetDay
  }, [isEndOfMonth, isStartOfMonth, effectivePayday])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Handle Switch Income/Expense in Modal
  const handleSwitchType = (newType: 'INCOME' | 'EXPENSE') => {
    setType(newType)
    const filtered = categories.filter((c) => c.type === newType || c.type === 'BOTH')
    if (filtered.length > 0) {
      setCategoryId(filtered[0].id)
    }
  }

  // Handle Apply Quick Template
  const handleApplyTemplate = (tpl: QuickTemplate) => {
    setDescription(tpl.name)
    setAmount(String(tpl.amount))
    if (tpl.categoryId) setCategoryId(tpl.categoryId)
    if (tpl.walletId) setWalletId(tpl.walletId)
    setType('EXPENSE')
  }

  // Handle Create Transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return
    setFormError(null)

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setFormError('Nominal transaksi harus lebih dari 0')
      return
    }

    if (!description.trim()) {
      setFormError('Deskripsi transaksi wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      const selectedCategory = categories.find((c) => c.id === categoryId)
      const selectedWallet = wallets.find((w) => w.id === walletId)

      const payload: CreateTransactionDto = {
        amount: numAmount,
        type,
        categoryId: categoryId || 'other',
        categoryName: selectedCategory?.name || 'Other',
        categoryIcon: selectedCategory?.icon || '📦',
        walletId: walletId || wallets[0]?.id || '',
        walletName: selectedWallet?.name || 'Dompet Utama',
        description: description.trim(),
        transactionDate: normalizeDateToYYYYMMDD(transactionDate),
      }

      await transactionService.create(user.uid, payload)

      setIsModalOpen(false)
      setDescription('')
      setAmount('')
      setRefreshTrigger((p) => p + 1)
      await refreshProfile()
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setFormError(errorObj.message || 'Gagal menyimpan transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle AI Scan Result
  const handleScanSuccess = (result: ReceiptScanResult) => {
    setIsScanModalOpen(false)
    setDescription(result.merchantName || 'Struk Belanja')
    setAmount(String(result.totalAmount || ''))
    setType('EXPENSE')

    if (result.suggestedCategoryId) {
      const matched = categories.find(
        (c) =>
          c.id.toLowerCase() === result.suggestedCategoryId.toLowerCase() ||
          c.name.toLowerCase() === result.suggestedCategoryName.toLowerCase()
      )
      if (matched) {
        setCategoryId(matched.id)
      }
    }

    if (result.transactionDate) {
      setTransactionDate(result.transactionDate)
    }

    setIsModalOpen(true)
  }

  // Handle Delete Transaction
  const handleConfirmDelete = async () => {
    if (!user?.uid || !txToDelete) return
    setIsDeletingTx(true)
    try {
      await transactionService.delete(user.uid, txToDelete)
      setTxToDelete(null)
      setRefreshTrigger((p) => p + 1)
      await refreshProfile()
    } catch (err) {
      console.error('[Dashboard] Error deleting transaction:', err)
    } finally {
      setIsDeletingTx(false)
    }
  }

  // Formatted Current Date String (Indonesian)
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [])

  if (loading && summary.transactions.length === 0) {
    return (
      <div className="flex flex-col gap-6 pb-16 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Hero Card Skeleton */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-64" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <Skeleton className="h-16 w-full sm:w-44 rounded-2xl" />
              <Skeleton className="h-16 w-full sm:w-44 rounded-2xl" />
              <Skeleton className="h-16 w-full sm:w-44 rounded-2xl" />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-white/8">
            <Skeleton className="h-5 w-72" />
          </div>
        </div>

        {/* 2-Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-16 max-w-7xl mx-auto">
      {/* 1. Header Bar & Quick Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* User Greeting & Date */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Halo, {userProfile?.name?.split(' ')[0] || 'Pengguna'} 👋
            </h1>

            {/* Income Mode / Payday Status Pill */}
            {userIncomeType === 'SALARIED' ? (
              <Link href="/payroll">
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all',
                    isPaydayToday
                      ? 'bg-emerald-500 text-white shadow-sm animate-pulse'
                      : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                  )}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  {isPaydayToday
                    ? 'Gajian Hari Ini! 🎉'
                    : `Gajian ${isEndOfMonth ? 'Akhir Bulan' : `Tgl ${effectivePayday}`} (${daysUntilPayday} hari lagi)`}
                </span>
              </Link>
            ) : userIncomeType === 'STUDENT_ALLOWANCE' ? (
              <Link href="/payroll">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 flex items-center gap-1">
                  <PiggyBank className="w-3.5 h-3.5" />
                  Uang Saku Bulanan
                </span>
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize font-medium">
            {currentDateFormatted}
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="glow"
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="shadow-md shadow-emerald-500/20 text-xs sm:text-sm font-bold"
          >
            Catat Transaksi
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsScanModalOpen(true)}
            leftIcon={<Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            className="text-xs sm:text-sm font-semibold"
          >
            Scan Struk AI
          </Button>
        </div>
      </div>

      {/* 2. Compact Dismissible Notification Banner */}
      {!hasNotificationEnabled && !isNotifBannerDismissed && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Aktifkan Pengingat Jatah Belanja Pagi
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Terima update batas jajan aman harianmu setiap jam 07:00 pagi langsung di layar HP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="glow"
              onClick={() => setIsNotifModalOpen(true)}
              className="text-xs py-1.5 px-3"
            >
              Aktifkan
            </Button>
            <button
              type="button"
              onClick={() => setIsNotifBannerDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Unified Financial Hero Card (All-in-One Net Worth + Safe-to-Spend) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 dark:from-[#151822] dark:via-[#131620] dark:to-[#0a1810] border border-slate-200 dark:border-white/10 shadow-xs relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Top Row: Total Net Worth & 2 Pillar Breakdown */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Kekayaan Bersih
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  Semua Kantong + Celengan
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                {formatRupiah(totalNetWorth)}
              </div>
            </div>

            {/* 3 Main Vault Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 lg:w-auto w-full">
              {/* Pillar 1: Liquid Operating Cash */}
              <Link
                href="/wallets"
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1e2a] border border-slate-200 dark:border-white/10 shadow-xs flex items-center gap-3 hover:border-emerald-500/40 transition-all group cursor-pointer"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Unlock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    Kas Bebas Belanja
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(effectiveOperatingCash)}
                  </span>
                </div>
              </Link>

              {/* Pillar 2: Locked Savings (from Wallets) */}
              <Link
                href="/wallets"
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1e2a] border border-slate-200 dark:border-white/10 shadow-xs flex items-center gap-3 hover:border-purple-500/40 transition-all group cursor-pointer"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    Tabungan Beku
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-purple-600 dark:text-purple-400">
                    {formatRupiah(totalLockedBalance)}
                  </span>
                </div>
              </Link>

              {/* Pillar 3: Savings in Goals (Celengan Impian) */}
              <Link
                href="/savings"
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1e2a] border border-slate-200 dark:border-white/10 shadow-xs flex items-center gap-3 hover:border-blue-500/40 transition-all group cursor-pointer"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    Celengan Impian
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                    {formatRupiah(totalSavingsInGoals)}
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* Bottom Row: Integrated Safe-to-Spend Daily Limit Bar */}
          <div className="pt-5 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  isOverToday
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                )}
              >
                <Compass className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isOverToday ? '⚠️ Lewat Batas Hari Ini' : 'Jatah Belanja Aman Hari Ini:'}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-black font-mono',
                      isOverToday ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {isOverToday ? `+${formatRupiah(todayExcessAmount)} lebih` : `${formatRupiah(dailyLimit)} / hari`}
                  </span>
                  {unpaidBillsThisMonth > 0 && (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold',
                        deductBills
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                      )}
                    >
                      {deductBills
                        ? `🛡️ Cicilan ${formatRupiah(unpaidBillsThisMonth)} diamankan`
                        : `⚡ Tanpa cicilan (Ada ${formatRupiah(unpaidBillsThisMonth)} belum bayar)`}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isOverToday
                    ? 'Tidak apa-apa — jatah hari esok otomatis dihitung ulang secara aman.'
                    : isUsedToday
                    ? `Sudah belanja: ${formatRupiah(todayExpense)} · Sisa aman hari ini: ${formatRupiah(todayRemainingAllowance)}`
                    : unpaidBillsThisMonth > 0 && deductBills
                    ? `Saran aman: dipotong cicilan ${formatRupiah(unpaidBillsThisMonth)} & tabungan ${formatRupiah(totalDailySavingsRequired)}/hari (tanpa cicilan: ${formatRupiah(dailyLimitWithoutBills)}/hari)`
                    : unpaidBillsThisMonth > 0 && !deductBills
                    ? `⚠️ Belum diamankan untuk cicilan ${formatRupiah(unpaidBillsThisMonth)} (saran aman: ${formatRupiah(dailyLimitWithBills)}/hari)`
                    : totalDailySavingsRequired > 0
                    ? `Bersih setelah disisihkan untuk tabungan impian ${formatRupiah(totalDailySavingsRequired)}/hari (${daysRemainingInMonth} hari tersisa)`
                    : `Dihitung dari sisa kas aktif ÷ ${daysRemainingInMonth} hari · Belum ada belanja hari ini`}
                </p>
              </div>
            </div>

            <Link href="/daily" className="shrink-0 self-end sm:self-auto">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                <span>Rincian Harian</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Main 2-Column Balanced Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Activity & Transactions (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Transactions Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col">
            {/* Header & Period Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-white/8">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Riwayat Mutasi Transaksi
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {summary.transactions.length} transaksi tercatat
                </span>
              </div>

              {/* Period Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold overflow-x-auto">
                {[
                  { key: 'today', label: 'Hari Ini' },
                  { key: 'week', label: 'Minggu Ini' },
                  { key: 'month', label: 'Bulan Ini' },
                  { key: 'all', label: 'Semua' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActivePeriod(tab.key as PeriodFilter)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg transition-all whitespace-nowrap',
                      activePeriod === tab.key
                        ? 'bg-white dark:bg-[#1f2433] text-slate-900 dark:text-white font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions List */}
            {summary.transactions.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-2xl mb-3">
                  📝
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Belum ada transaksi di periode ini
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
                  Mulai catat transaksi pertamamu atau gunakan template cepat.
                </p>
                <Button
                  size="sm"
                  variant="glow"
                  onClick={() => setIsModalOpen(true)}
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Catat Transaksi Baru
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {summary.transactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME'
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 hover:bg-slate-100 dark:bg-[#1a1e2a]/60 dark:hover:bg-[#1a1e2a] border border-slate-100 dark:border-white/5 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#131620] border border-slate-200 dark:border-white/10 flex items-center justify-center text-lg shrink-0 shadow-xs">
                          {tx.categoryIcon || '📦'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] sm:max-w-[220px]">
                              {tx.description}
                            </span>
                            <Badge variant={isIncome ? 'income' : 'expense'} size="sm">
                              {tx.categoryName}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            {tx.transactionDate} {tx.walletName ? `• ${tx.walletName}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pl-2">
                        <span
                          className={cn(
                            'text-sm sm:text-base font-bold font-mono tabular-nums tracking-tight',
                            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          )}
                        >
                          {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => setTxToDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-[#131620] transition-colors"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Financial Insights & Targets (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Category Breakdown Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-white/8">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Alokasi Pengeluaran
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {summary.categoryBreakdown.length} Kategori
              </span>
            </div>

            {summary.categoryBreakdown.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada pengeluaran di periode ini.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {summary.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium">
                        <span>{cat.icon}</span>
                        <span className="truncate max-w-[120px]">{cat.name}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatRupiah(cat.amount)}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(4, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Savings Rate Ratio */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/8 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                <PiggyBank className="w-4 h-4 text-emerald-500" />
                <span>Rasio Tabungan Bulan Ini:</span>
              </span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                {summary.savingsRate}%
              </span>
            </div>
          </div>

          {/* Celengan Impian Widget (If Any) */}
          {savingsGoals.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-white/8">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Celengan Impian Aktif ({savingsGoals.length})
                  </h3>
                </div>
                <Link
                  href="/savings"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Semua</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                {savingsGoals.slice(0, 3).map((goal) => {
                  const pct =
                    goal.targetAmount > 0
                      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                      : 0

                  return (
                    <div
                      key={goal.id}
                      className="p-3 rounded-2xl bg-slate-50/60 dark:bg-white/3 border border-slate-100 dark:border-white/5"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{goal.icon || '🎯'}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {goal.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {pct}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{formatRupiah(goal.currentAmount)}</span>
                        <span>Target {formatRupiah(goal.targetAmount)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Wallets & Accounts Quick Glance */}
          {wallets.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-white/8">
                <div className="flex items-center gap-2">
                  <WalletIcon className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kantong &amp; Rekening ({wallets.length})
                  </h3>
                </div>
                <Link
                  href="/wallets"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Kelola</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {wallets.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-2xl bg-slate-50/60 dark:bg-white/3 border border-slate-100 dark:border-white/5 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{w.icon || '💳'}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {w.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                      {formatRupiah(w.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-white/8">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Catat Transaksi Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-800 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="flex flex-col gap-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleSwitchType('EXPENSE')}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-bold transition-all',
                    type === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchType('INCOME')}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-bold transition-all',
                    type === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  Pemasukan
                </button>
              </div>

              {/* Quick Template Selector */}
              {templates.length > 0 && type === 'EXPENSE' && (
                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Template Cepat:
                    </span>
                    <Link href="/templates" className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px]">
                      Atur
                    </Link>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1a1e2a] border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-2xs"
                      >
                        <span>{tpl.icon || '⚡'}</span>
                        <span>{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <FormField label="Nominal (Rp)" required>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono text-base font-bold"
                  required
                />
              </FormField>

              <FormField label="Keterangan / Merchant" required>
                <Input
                  type="text"
                  placeholder="Contoh: Nasi Padang, Belanja Bulanan"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Kategori" required>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {categories
                      .filter((c) => c.type === type || c.type === 'BOTH')
                      .map((c) => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-[#1a1d27]">
                          {c.icon} {c.name}
                        </option>
                      ))}
                  </select>
                </FormField>

                <FormField label="Kantong / Rekening" required>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} className="bg-white dark:bg-[#1a1d27]">
                        {w.icon || '💳'} {w.name} ({formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Tanggal Transaksi" required>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/8 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  disabled={submitting}
                  className="px-6 font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
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
        onApplyResult={handleScanSuccess}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(txToDelete)}
        title="Hapus Transaksi?"
        description="Apakah Anda yakin ingin menghapus catatan transaksi ini? Saldo dompet akan disesuaikan kembali."
        confirmText="Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
        loading={isDeletingTx}
        onConfirm={handleConfirmDelete}
        onClose={() => setTxToDelete(null)}
      />

      {/* Notification Prompt Modal */}
      <NotificationPromptModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onSuccess={() => {
          setIsNotifModalOpen(false)
          setHasNotificationEnabled(true)
        }}
      />

      {/* Onboarding Wizard Modal */}
      {isOnboardingModalOpen && user?.uid && (
        <OnboardingWizard
          userId={user.uid}
          userName={userProfile?.name}
          onClose={() => setIsOnboardingModalOpen(false)}
          onComplete={() => {
            setIsOnboardingModalOpen(false)
            setRefreshTrigger((p) => p + 1)
          }}
        />
      )}
    </div>
  )
}
