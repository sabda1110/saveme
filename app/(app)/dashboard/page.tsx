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
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { normalizeDateToYYYYMMDD } from '@/lib/utils/date'
import { OnboardingWizard } from '@/components/organisms/OnboardingWizard'
import { GettingStartedWidget } from '@/components/organisms/GettingStartedWidget'
import { RecurringBillsCard } from '@/components/organisms/RecurringBillsCard'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { ReceiptScannerModal } from '@/components/organisms/ReceiptScannerModal'
import { PaydayAllocationModal } from '@/components/organisms/PaydayAllocationModal'
import { NotificationPromptModal } from '@/components/organisms/NotificationPromptModal'
import { GroupSavingsInviteModal } from '@/components/organisms/GroupSavingsInviteModal'
import { notificationService } from '@/lib/services/notification.firebase'
import { groupSavingsService } from '@/lib/services/group-savings.firebase'
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
  Zap,
  DollarSign,
  GraduationCap,
  Bell,
  Users,
  AlertTriangle,
} from 'lucide-react'
import type { Category, DashboardSummary, RecurringBill, SavingsGoal, Wallet, ReceiptScanResult, QuickTemplate, GroupSavings, GroupSavingsMember } from '@/types'
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
  const [pendingGroupInvites, setPendingGroupInvites] = useState<{
    invite: GroupSavingsMember
    group: GroupSavings
  }[]>([])
  const [userGroupSavings, setUserGroupSavings] = useState<{
    group: GroupSavings
    member: GroupSavingsMember
    allMembers: GroupSavingsMember[]
  }[]>([])
  const [activeGroupInviteModal, setActiveGroupInviteModal] = useState<{
    invite: GroupSavingsMember
    group: GroupSavings
  } | null>(null)
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('month')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isPaydayModalOpen, setIsPaydayModalOpen] = useState(false)
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false)
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false)
  const [hasNotificationEnabled, setHasNotificationEnabled] = useState(false)
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
  const [isSavingsDeposit, setIsSavingsDeposit] = useState(false)
  const [targetGoalId, setTargetGoalId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        // 1. Process any due recurring bills automatically (skip gracefully if offline)
        try {
          await recurringService.processDueRecurringBills(user.uid)
        } catch {
          // Graceful skip in offline mode
        }

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

        const [data, cats, bills, goals, userWallets, userTemplates, notifSettings, groupInvites, userGroups] = await Promise.all([
          transactionService.getDashboardSummary(user.uid, from, to),
          categoryService.getCategories(),
          recurringService.getUserRecurringBills(user.uid),
          savingsService.getUserGoals(user.uid),
          walletService.getUserWallets(user.uid),
          quickTemplateService.getUserTemplates(user.uid),
          notificationService.getSettings(user.uid),
          groupSavingsService.getPendingInvites(user.uid),
          groupSavingsService.getUserGroups(user.uid),
        ])

        if (isMounted) {
          setSummary(data)
          setCategories(cats)
          setRecurringBills(bills)
          setSavingsGoals(goals)
          setWallets(userWallets)
          setTemplates(userTemplates)
          setHasNotificationEnabled(notifSettings.enabled)
          setPendingGroupInvites(groupInvites)
          setUserGroupSavings(userGroups)

          // Auto-prompt Notification Modal if not yet enabled and not snoozed
          if (!notifSettings.enabled && typeof window !== 'undefined') {
            try {
              const snoozedUntil = localStorage.getItem('saveme_notif_modal_snoozed')
              const isSnoozed = snoozedUntil && Number(snoozedUntil) > Date.now()
              if (!isSnoozed) {
                setTimeout(() => {
                  if (isMounted) setIsNotifModalOpen(true)
                }, 1200)
              }
            } catch {
              // ignore
            }
          }

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
    setAmount((Number(result.totalAmount) || 0).toString())
    setDescription(result.merchantName || 'Struk Belanja')
    setTransactionDate(normalizeDateToYYYYMMDD(result.transactionDate))

    const catId = result.suggestedCategoryId?.toLowerCase() || ''
    const catName = result.suggestedCategoryName?.toLowerCase() || ''

    const matchedCategory = categories.find(
      (c) =>
        (c.id && catId && c.id.toLowerCase() === catId) ||
        (c.name && catName && c.name.toLowerCase().includes(catName))
    )
    if (matchedCategory) {
      setCategoryId(matchedCategory.id)
    }

    setFormError(null)
    setIsModalOpen(true)
  }

  // Handle Auto-fill from Quick Template
  const handleSelectTemplate = (templateId: string) => {
    if (!templateId) return
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return

    setType('EXPENSE')
    setAmount(tpl.amount.toString())
    setDescription(tpl.name)
    if (tpl.categoryId) setCategoryId(tpl.categoryId)
    if (tpl.walletId) setWalletId(tpl.walletId)
  }

  // Daily Overbudget Confirmation State
  const [overbudgetWarning, setOverbudgetWarning] = useState<{
    isOpen: boolean
    amount: number
    limit: number
    excess: number
  }>({
    isOpen: false,
    amount: 0,
    limit: 0,
    excess: 0,
  })

  // Handle Type Switcher with locked wallet safeguard
  const handleSwitchType = (newType: 'INCOME' | 'EXPENSE') => {
    setType(newType)
    if (newType === 'EXPENSE') {
      const selectedW = wallets.find((w) => w.id === walletId)
      if (selectedW?.isLocked) {
        const firstUnlocked = wallets.find((w) => !w.isLocked)
        if (firstUnlocked) setWalletId(firstUnlocked.id)
      }
    }
  }

  const handleCreateTransaction = async (e?: React.FormEvent, skipOverbudgetCheck = false) => {
    if (e) e.preventDefault()
    setFormError(null)

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setFormError('Nominal transaksi harus lebih besar dari 0')
      return
    }

    const todayStr = new Date().toISOString().split('T')[0]

    // Daily Overbudget Interceptor Warning
    if (
      !skipOverbudgetCheck &&
      type === 'EXPENSE' &&
      transactionDate === todayStr &&
      dynamicSafeToSpendDaily > 0 &&
      numAmount > dynamicSafeToSpendDaily
    ) {
      setOverbudgetWarning({
        isOpen: true,
        amount: numAmount,
        limit: dynamicSafeToSpendDaily,
        excess: numAmount - dynamicSafeToSpendDaily,
      })
      return
    }

    const selectedCategory = categories.find((c) => c.id === categoryId) || {
      id: 'other',
      name: 'Other',
      icon: '📦',
      type: 'BOTH' as const,
    }

    const selectedWallet = wallets.find((w) => w.id === walletId)

    if (type === 'EXPENSE' && selectedWallet?.isLocked) {
      setFormError('Kantong simpanan terkunci tidak dapat digunakan untuk pengeluaran')
      return
    }

    if (!user?.uid) return

    setSubmitting(true)
    try {
      if (isSavingsDeposit && targetGoalId && type === 'EXPENSE') {
        const targetGoal = savingsGoals.find((g) => g.id === targetGoalId)
        if (targetGoal) {
          await savingsService.depositToGoal(
            user.uid,
            targetGoal.id,
            numAmount,
            selectedWallet?.id,
            selectedWallet?.name
          )
        }
      } else {
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
      }

      // Reset form & close modal
      setAmount('')
      setDescription('')
      setIsSavingsDeposit(false)
      setTargetGoalId('')
      setIsModalOpen(false)
      setOverbudgetWarning({ isOpen: false, amount: 0, limit: 0, excess: 0 })
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
      // transactionService.delete automatically handles wallet balance reversal internally
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
  // Operating: unlocked & not earmarked → counts toward daily limit
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked && !w.isEarmarked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])
  const earmarkedWallets = useMemo(() => wallets.filter((w) => w.isEarmarked && !w.isLocked), [wallets])

  const totalSpendingBalance = useMemo(
    () => spendingWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [spendingWallets]
  )

  const totalLockedBalance = useMemo(
    () => lockedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [lockedWallets]
  )

  const totalEarmarkedBalance = useMemo(
    () => earmarkedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [earmarkedWallets]
  )

  const totalSavingsInGoals = useMemo(
    () => savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0),
    [savingsGoals]
  )

  // Liquid Operating Cash for Daily Spending (ONLY unlocked, non-earmarked wallets)
  const effectiveOperatingCash = wallets.length > 0 ? totalSpendingBalance : summary.balance

  // Total Net Worth = all wallets (operating + earmarked + locked) + goals
  const totalNetWorth =
    (wallets.length > 0
      ? totalSpendingBalance + totalEarmarkedBalance + totalLockedBalance
      : summary.balance) + totalSavingsInGoals

  const now = useMemo(() => new Date(), [])
  const currentDay = now.getDate()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemainingInMonth = Math.max(1, lastDayOfMonth - currentDay + 1)


  // ── Real-time Saldo Bebas Daily Limit ────────────────────────────
  // Formula: Saldo kantong non-locked, non-earmarked ÷ Sisa hari bulan ini
  // Earmarked wallets (e.g. uang minyak, makan) dikecualikan dari perhitungan batas harian.
  const dailyLimit = Math.round(effectiveOperatingCash / daysRemainingInMonth)

  // Total EXPENSE transactions for today
  const todayStr = now.toISOString().split('T')[0]

  const todayExpense = useMemo(() => {
    return summary.transactions
      .filter((t) => t.type === 'EXPENSE' && t.transactionDate === todayStr)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [summary.transactions, todayStr])

  // 3-State card logic
  // State 1 — Normal:  belum ada belanja hari ini           → hijau (else branch)
  // State 2 — Dipakai: belanja > 0 tapi masih dalam batas  → hijau + progress
  // State 3 — Lewat:   belanja melebihi batas harian        → amber (efek hanya ke besok)
  const isUsedToday = todayExpense > 0 && todayExpense <= dailyLimit
  const isOverToday = dailyLimit > 0 && todayExpense > dailyLimit
  const todayRemainingAllowance = Math.max(0, dailyLimit - todayExpense)
  const todayExcessAmount = isOverToday ? todayExpense - dailyLimit : 0

  // Keep dynamicSafeToSpendDaily alias for overbudget interceptor in handleCreateTransaction
  const dynamicSafeToSpendDaily = dailyLimit

  // Daily Savings Required across all active goals (unchanged)
  const totalDailySavingsRequired = useMemo(() => {
    return savingsGoals.reduce((sum, g) => {
      if (!g.targetDate) return sum
      const targetD = new Date(g.targetDate)
      const diffDays = Math.max(1, Math.ceil((targetD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingTarget = Math.max(0, g.targetAmount - g.currentAmount)
      return sum + Math.round(remainingTarget / diffDays)
    }, 0)
  }, [savingsGoals, now])

  const groupSavingsDailyRequired = useMemo(() => {
    return userGroupSavings.reduce((sum, g) => {
      if (!g.group.targetDate) return sum
      const targetD = new Date(g.group.targetDate)
      const diffDays = Math.max(1, Math.ceil((targetD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const remainingTarget = Math.max(0, g.member.myTarget - g.member.myContributed)
      return sum + Math.round(remainingTarget / diffDays)
    }, 0)
  }, [userGroupSavings, now])

  const combinedDailySavingsCommitted = totalDailySavingsRequired + groupSavingsDailyRequired
  const isSavingsDeficitRisk = combinedDailySavingsCommitted > dailyLimit && dailyLimit > 0
  const savingsDeficitAmount = Math.max(0, combinedDailySavingsCommitted - dailyLimit)

  // Payday & Income Mode Calculations
  const userIncomeType = userProfile?.incomeType || 'SALARIED'
  const scheduleType =
    userProfile?.paydayScheduleType ||
    (userProfile?.isEndOfMonthPayday
      ? 'END_OF_MONTH'
      : userProfile?.paydayDay === 1
      ? 'START_OF_MONTH'
      : 'CUSTOM')
  const isEndOfMonth = scheduleType === 'END_OF_MONTH' || Boolean(userProfile?.isEndOfMonthPayday)
  const isStartOfMonth = scheduleType === 'START_OF_MONTH'
  const effectivePayday = isEndOfMonth ? lastDayOfMonth : isStartOfMonth ? 1 : (userProfile?.paydayDay || 25)

  const daysUntilPayday = useMemo(() => {
    if (currentDay === effectivePayday) return 0
    if (currentDay < effectivePayday) return effectivePayday - currentDay
    return (lastDayOfMonth - currentDay) + effectivePayday
  }, [currentDay, effectivePayday, lastDayOfMonth])

  const isPaydayToday = userIncomeType === 'SALARIED' && daysUntilPayday === 0

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
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Halo, {userProfile?.name?.split(' ')[0] || 'Teman SaveMe'}! 👋
            </h1>
            <Badge variant="brand" size="sm">
              {userIncomeType === 'STUDENT_ALLOWANCE'
                ? 'Pelajar'
                : userIncomeType === 'FREELANCE_VARIABLE'
                ? 'Freelancer'
                : userProfile?.role || 'USER'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
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
            Atur Profil
          </Button>

          <Link href="/payroll">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/10 cursor-pointer"
              leftIcon={<DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
            >
              {userIncomeType === 'STUDENT_ALLOWANCE' ? 'Alokasi Uang Saku' : 'Alokasi Gaji'}
            </Button>
          </Link>

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
            className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
            leftIcon={<Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
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

      {/* 👥 Pending Group Savings Invitation Alert */}
      {pendingGroupInvites.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-500/30 dark:border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              🎉
            </span>
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Undangan Celengan Bersama Masuk ({pendingGroupInvites.length})
              </p>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                Kamu diundang ke <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{pendingGroupInvites[0].group.name}&rdquo;</span> dengan target bagian <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{pendingGroupInvites[0].invite.percentage}%</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setActiveGroupInviteModal(pendingGroupInvites[0])}
              className="text-xs"
            >
              Lihat Undangan
            </Button>
          </div>
        </div>
      )}

      {/* 💰 Payday & Income Mode Adaptive Hub Banner */}
      <div
        className={cn(
          'p-5 sm:p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all',
          isPaydayToday
            ? 'bg-gradient-to-r from-emerald-50 via-white to-white dark:from-emerald-950/80 dark:via-[#1a1d27] dark:to-[#161822] border-green-500/50 shadow-green-500/10'
            : userIncomeType === 'STUDENT_ALLOWANCE'
            ? 'bg-gradient-to-r from-emerald-50 via-white to-white dark:from-emerald-950/40 dark:via-[#1a1d27] dark:to-[#161822] border-emerald-500/30'
            : 'bg-gradient-to-r from-purple-50 via-white to-white dark:from-purple-950/50 dark:via-[#1a1d27] dark:to-[#161822] border-purple-500/30 dark:border-purple-500/40'
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={cn(
                'p-3 rounded-2xl border shrink-0',
                isPaydayToday
                  ? 'bg-green-500/20 border-green-500/40 text-green-600 dark:text-green-400 animate-pulse'
                  : userIncomeType === 'STUDENT_ALLOWANCE'
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                  : 'bg-purple-500/20 border-purple-500/30 text-purple-600 dark:text-purple-300'
              )}
            >
              {userIncomeType === 'STUDENT_ALLOWANCE' ? (
                <GraduationCap className="w-6 h-6" />
              ) : userIncomeType === 'FREELANCE_VARIABLE' ? (
                <Zap className="w-6 h-6" />
              ) : (
                <Calendar className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {userIncomeType === 'STUDENT_ALLOWANCE'
                    ? 'Hub Uang Saku & Celengan Pelajar'
                    : userIncomeType === 'FREELANCE_VARIABLE'
                    ? 'Hub Pendapatan Bebas & Freelance'
                    : 'Siklus & Alokasi Gajian'}
                </span>
                {isPaydayToday ? (
                  <Badge variant="brand" size="sm">
                    🎉 HARI INI GAJIAN! (Tgl {effectivePayday})
                  </Badge>
                ) : userIncomeType === 'SALARIED' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[11px] font-bold">
                    H-{daysUntilPayday} Menuju Gajian ({isEndOfMonth ? 'Akhir Bulan' : isStartOfMonth ? 'Awal Bulan (Tgl 1)' : `Tgl ${effectivePayday}`})
                  </span>
                ) : userIncomeType === 'STUDENT_ALLOWANCE' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                    🎒 Mode Pelajar / Uang Saku
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                    ⚡ Mode Pemasukan Bebas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                {isPaydayToday
                  ? 'Gaji bulan ini sudah masuk! Segera alokasikan ke Kas Belanja, Tabungan Beku, dan Celengan Impian.'
                  : userIncomeType === 'STUDENT_ALLOWANCE'
                  ? `Uang saku bulanan (${formatRupiah(userProfile?.monthlyIncome || 0)}). Bagi otomatis menjadi jatah jajan harian dan tabungan celengan impian.`
                  : userIncomeType === 'FREELANCE_VARIABLE'
                  ? 'Pemasukan fleksibel tanpa jadwal gajian tetap. Jatah belanja harian dihitung murni dari sisa saldo kas aktif.'
                  : `Gaji masuk ke ${userProfile?.primarySalaryWalletName ? `Rekening ${userProfile.primarySalaryWalletName}` : 'rekening utamamu'} setiap ${isEndOfMonth ? 'hari terakhir bulan' : isStartOfMonth ? 'tanggal 1 awal bulan' : `tanggal ${effectivePayday}`}. Gunakan Alokasi Cerdas untuk mengamankan tabungan (*Pay Yourself First*).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <Link href="/payroll">
              <Button
                variant="glow"
                size="sm"
                className={cn(
                  'font-bold cursor-pointer text-xs sm:text-sm px-4 py-2.5',
                  isPaydayToday
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/25'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                )}
                leftIcon={<DollarSign className="w-4 h-4" />}
              >
                {isPaydayToday
                  ? 'Alokasikan Gaji Sekarang'
                  : userIncomeType === 'STUDENT_ALLOWANCE'
                  ? 'Buka Hub Uang Saku'
                  : 'Buka Hub Payroll'}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Smart Notification Prompt Banner (Shown when notifications not yet enabled) */}
      {!hasNotificationEnabled && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  Aktifkan Pengingat Jatah Belanja Pagi
                </h4>
                <Badge variant="brand" size="sm">
                  07:00 Pagi
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Dapatkan info batas belanja harian aman setiap pagi langsung di HP/layarmu agar bebas dari overbudget.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="glow"
            size="sm"
            onClick={() => setIsNotifModalOpen(true)}
            className="shrink-0 text-xs self-stretch sm:self-auto font-bold"
            leftIcon={<Bell className="w-3.5 h-3.5" />}
          >
            Aktifkan Pengingat
          </Button>
        </div>
      )}

      {/* Getting Started Guide Checklist */}
      <GettingStartedWidget
        hasOnboardingCompleted={Boolean(userProfile?.hasCompletedOnboarding)}
        hasTransactions={summary.transactions.length > 0}
        hasSavingsRate={summary.savingsRate >= 20}
        hasNotificationEnabled={hasNotificationEnabled}
        onAddTransactionClick={() => setIsModalOpen(true)}
        onEnableNotificationClick={() => setIsNotifModalOpen(true)}
      />

      {/* 🚨 SMART SAVINGS DEFICIT RISK BANNER 🚨 */}
      {isSavingsDeficitRisk && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-400 dark:border-rose-800/60 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  Target Tabungan Melebihi Kapasitas Kas Harian
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono">
                  Defisit {formatRupiah(savingsDeficitAmount)}/hari
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Kewajiban celenganmu butuh <strong>{formatRupiah(combinedDailySavingsCommitted)}/hari</strong>, sedangkan kapasitas kasmu hanya <strong>{formatRupiah(dailyLimit)}/hari</strong>. Sistem telah mengamankan jatah makanmu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
            <Link href="/daily" className="flex-1 sm:flex-none">
              <Button variant="secondary" size="sm" className="w-full text-xs text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800">
                Solusi Jatah Belanja
              </Button>
            </Link>
            <Link href="/savings" className="flex-1 sm:flex-none">
              <Button variant="primary" size="sm" className="w-full text-xs bg-rose-600 hover:bg-rose-500 text-white">
                Sesuaikan Deadline
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2 Smart Dynamic Indicators (Safe-to-Spend Today & Daily Savings Required) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dynamic Safe-to-Spend Today — 3-State Card */}
        <Link
          href="/daily"
          className={cn(
            'p-5 rounded-2xl shadow-md dark:shadow-xl flex items-center justify-between transition-all hover:-translate-y-0.5 group',
            isOverToday
              ? 'bg-amber-50/80 dark:bg-gradient-to-br dark:from-amber-900/40 dark:via-amber-950/20 dark:to-[#1a1d27] border border-amber-500/40 shadow-sm dark:shadow-amber-950/30'
              : 'bg-green-50/80 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:via-emerald-950/20 dark:to-[#1a1d27] border border-green-500/30 dark:border-emerald-500/40 shadow-sm dark:shadow-emerald-950/30'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0',
                isOverToday
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-green-500/20 border-green-500/30 text-green-600 dark:text-green-400'
              )}
            >
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    isOverToday ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'
                  )}
                >
                  {isOverToday ? '⚠️ Lewat Jatah Hari Ini' : 'Jatah Belanja Hari Ini'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  ({daysRemainingInMonth} hari sisa)
                </span>
              </div>

              {isOverToday ? (
                <>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-800 dark:text-amber-300 tabular-nums tracking-tight mt-0.5">
                    +{formatRupiah(todayExcessAmount)}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-sans font-normal ml-1">lebih</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Jatah hari ini:{' '}
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">{formatRupiah(dailyLimit)}</span>
                    {' '}· Sudah:{' '}
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">{formatRupiah(todayExpense)}</span>
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400/70 mt-0.5">
                    💡 Tidak apa-apa — jatah besok otomatis menyesuaikan
                  </p>
                </>
              ) : isUsedToday ? (
                <>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                    {formatRupiah(dailyLimit)}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-sans font-normal ml-1">/ hari</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Sudah belanja:{' '}
                    <span className="text-green-700 dark:text-green-300 font-semibold">{formatRupiah(todayExpense)}</span>
                    {' '}· Sisa:{' '}
                    <span className="text-green-700 dark:text-green-300 font-semibold">{formatRupiah(todayRemainingAllowance)}</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                    {formatRupiah(dailyLimit)}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-sans font-normal ml-1">/ hari</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    {`Dari saldo aktif ÷ ${daysRemainingInMonth} hari · Belum ada belanja hari ini`}
                  </p>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors shrink-0" />
        </Link>

        {/* Daily Required Savings for Goals */}
        <div className="p-5 rounded-2xl bg-purple-50/80 dark:bg-gradient-to-br dark:from-purple-900/40 dark:via-purple-950/20 dark:to-[#1a1d27] border border-purple-500/30 dark:border-purple-500/40 shadow-sm dark:shadow-purple-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 dark:bg-purple-500/25 border border-purple-500/30 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Wajib Disisihkan per Hari
                </span>
                <span className="text-[10px] text-purple-600/70 dark:text-purple-300/70">({savingsGoals.length} Celengan)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-700 dark:text-purple-200 tabular-nums tracking-tight mt-0.5">
                {formatRupiah(totalDailySavingsRequired)}
                <span className="text-xs text-purple-600/70 dark:text-purple-300/70 font-sans font-normal ml-1">/ hari</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                Nominal yang perlu kamu tabung agar seluruh target impianmu tercapai tepat waktu.
              </p>
            </div>
          </div>
          <Link href="/savings" className="p-2 rounded-xl bg-white dark:bg-[#21263a] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white border border-purple-200 dark:border-purple-500/30 transition-colors shadow-sm">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-100 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] overflow-x-auto max-w-full no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setActivePeriod('today')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              activePeriod === 'today'
                ? 'bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-green-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm dark:shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                ? 'bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-green-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm dark:shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                ? 'bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-green-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm dark:shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                ? 'bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-green-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm dark:shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Semua Riwayat
          </button>
        </div>
      </div>

      {/* 3 Main Interconnected Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Kekayaan Bersih (Net Worth) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#1e2333] dark:via-[#1a1d27] dark:to-[#161822] border border-slate-200 dark:border-[#2d3348] relative overflow-hidden shadow-md dark:shadow-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Kekayaan Bersih
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight mb-1 sm:mb-2">
            {formatRupiah(totalNetWorth)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Seluruh Kantong + Celengan</span>
          </div>
        </div>

        {/* Kas Operasional (Liquid Spending Cash) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-emerald-950/30 dark:via-[#1a1d27] dark:to-[#161822] border border-green-500/30 dark:border-emerald-500/40 shadow-md dark:shadow-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-emerald-400 flex items-center gap-1">
              <Unlock className="w-3.5 h-3.5" /> Kas Operasional (Belanja)
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 dark:bg-emerald-500/20 text-green-600 dark:text-emerald-300 flex items-center justify-center">
              <WalletIcon className="w-4 h-4" />
            </div>
          </div>
          <div
            className={cn(
              'text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight mb-1 sm:mb-2',
              effectiveOperatingCash >= 0 ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {formatRupiah(effectiveOperatingCash)}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {spendingWallets.length > 0 ? `Uang cair dari ${spendingWallets.length} kantong aktif` : 'Uang cair siap dibelanjakan'}
          </span>
        </div>

        {/* Tabungan Beku & Celengan Impian */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-amber-950/30 dark:via-[#1a1d27] dark:to-[#161822] border border-amber-500/30 dark:border-amber-500/40 shadow-md dark:shadow-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Tabungan Beku &amp; Celengan
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-700 dark:text-amber-300 tabular-nums tracking-tight mb-1 sm:mb-2">
            {formatRupiah(totalLockedBalance + totalSavingsInGoals)}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {lockedWallets.length} Kantong Beku + {savingsGoals.length} Celengan
          </span>
        </div>
      </div>

      {/* Quick Glance: Kantong & Rekening Widget */}
      {wallets.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#2d3348]">
            <div className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Rincian Kantong Keuangan &amp; Rekening
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Saldo tersebar di {wallets.length} kantong aktif
                </span>
              </div>
            </div>
            <Link
              href="/wallets"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Kelola Kantong</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {wallets.map((w) => {
              const isLockedWallet = Boolean(w.isLocked)
              const isEarmarkedWallet = Boolean(w.isEarmarked) && !isLockedWallet
              return (
                <div
                  key={w.id}
                  className={cn(
                    'p-3.5 rounded-xl border flex items-center justify-between transition-all',
                    isLockedWallet
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/30'
                      : isEarmarkedWallet
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/30 dark:border-blue-500/30'
                      : 'bg-slate-50 dark:bg-[#21263a]/60 border-slate-200 dark:border-[#2d3348]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{w.icon || '💳'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                          {w.name}
                        </span>
                        {isLockedWallet ? (
                          <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold px-1 rounded">
                            🔒 Beku
                          </span>
                        ) : isEarmarkedWallet ? (
                          <span className="text-[9px] bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold px-1 rounded">
                            🎯 Khusus
                          </span>
                        ) : (
                          <span className="text-[9px] bg-green-500/20 text-green-700 dark:text-green-400 font-bold px-1 rounded">
                            🟢 Kas
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 block mt-0.5">
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
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#2d3348]">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Progres Celengan Impian Aktif
              </h3>
            </div>
            <Link href="/savings" className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 font-semibold">
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
                <div key={goal.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#21263a]/60 border border-slate-200 dark:border-[#2d3348] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{goal.icon || '🎯'}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{goal.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{pct}%</span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 dark:bg-[#131620] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
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
        wallets={wallets}
        onUpdated={() => setRefreshTrigger((p) => p + 1)}
      />

      {/* Breakdown per Kategori & Feed Transaksi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (5 Cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Alokasi Pengeluaran</h3>
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
                      <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="font-medium truncate max-w-[120px] sm:max-w-none">{cat.name}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-800 dark:text-slate-300 tabular-nums font-semibold">
                          {formatRupiah(cat.amount)}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-[#21263a] rounded-full overflow-hidden">
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
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#2d3348] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Rasio Tabungan:</span>
            </span>
            <span className="font-bold text-green-600 dark:text-green-400 font-mono text-sm">
              {summary.savingsRate}%
            </span>
          </div>
        </div>

        {/* Live Transaction Table / List (7 Cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Transaksi ({summary.transactions.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500">Urut terbaru</span>
          </div>

          {summary.transactions.length === 0 ? (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">📝</div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#21263a]/60 dark:hover:bg-[#21263a] border border-slate-200 dark:border-[#2d3348]/70 transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex items-center justify-center text-base sm:text-lg shrink-0 shadow-sm">
                        {tx.categoryIcon || '📦'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">
                            {tx.description}
                          </span>
                          <Badge variant={isIncome ? 'income' : 'expense'} size="sm">
                            {tx.categoryName}
                          </Badge>
                        </div>
                        <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tx.transactionDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
                      <span
                        className={cn(
                          'text-xs sm:text-base font-bold font-mono tabular-nums tracking-tight',
                          isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => setTxToDelete(tx.id)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-[#1a1d27] transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Catat Transaksi Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="flex flex-col gap-3.5 sm:gap-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348]">
                <button
                  type="button"
                  onClick={() => handleSwitchType('EXPENSE')}
                  className={cn(
                    'py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    type === 'EXPENSE'
                      ? 'bg-red-600 dark:bg-red-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchType('INCOME')}
                  className={cn(
                    'py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    type === 'INCOME'
                      ? 'bg-green-600 dark:bg-green-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Pemasukan
                </button>
              </div>

              {/* Quick Template Auto-Fill Selector */}
              {templates.length > 0 && type === 'EXPENSE' && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#131620]/60 border border-slate-200 dark:border-[#2d3348]/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-semibold">
                      <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      Pakai Template Cepat:
                    </span>
                    <Link href="/templates" className="text-amber-600 dark:text-amber-400 hover:underline text-[11px]">
                      Atur Template
                    </Link>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTemplate(t.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] hover:border-amber-500/60 hover:bg-slate-50 dark:hover:bg-[#2a3048] text-xs text-slate-700 dark:text-slate-200 transition-all shrink-0 cursor-pointer active:scale-95 shadow-sm"
                      >
                        <span>{t.icon}</span>
                        <span className="font-medium">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Celengan Impian Direct Deposit Selector */}
              {savingsGoals.length > 0 && type === 'EXPENSE' && (
                <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-[#131620]/60 border border-purple-200 dark:border-[#2d3348] space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSavingsDeposit}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setIsSavingsDeposit(checked)
                        if (checked) {
                          if (!targetGoalId && savingsGoals[0]) {
                            setTargetGoalId(savingsGoals[0].id)
                          }
                          const savCat = categories.find(
                            (c) =>
                              c.id === 'savings' ||
                              c.id === 'savings_deposit' ||
                              c.name.toLowerCase().includes('tabung')
                          )
                          if (savCat) {
                            setCategoryId(savCat.id)
                          }
                        }
                      }}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Alokasikan / Setor ke Celengan Impian</span>
                    </div>
                  </label>

                  {isSavingsDeposit && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Pilih Celengan Tujuan:
                      </label>
                      <select
                        value={targetGoalId}
                        onChange={(e) => setTargetGoalId(e.target.value)}
                        className="w-full bg-white dark:bg-[#21263a] text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 dark:border-[#2d3348] focus:border-purple-500 focus:outline-none cursor-pointer"
                      >
                        {savingsGoals.map((g) => {
                          const remaining = Math.max(0, g.targetAmount - g.currentAmount)
                          return (
                            <option key={g.id} value={g.id}>
                              {g.icon || '🎯'} {g.name} (Terkumpul: {formatRupiah(g.currentAmount)} / Sisa: {formatRupiah(remaining)})
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}
                </div>
              )}

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
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 dark:border-[#2d3348]/40 rounded-xl bg-slate-50 dark:bg-[#131620]/50">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer',
                        categoryId === cat.id
                          ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-white font-bold'
                          : 'bg-white dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:border-slate-400'
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
                <FormField label={type === 'EXPENSE' ? 'Kantong Pembayaran' : 'Kantong Tujuan'}>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full bg-white dark:bg-[#21263a] text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-xs sm:text-sm border border-slate-200 dark:border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
                  >
                    {wallets
                      .filter((w) => (type === 'EXPENSE' ? !w.isLocked : true))
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon} {w.name} {w.isLocked ? '🔒 [Simpanan Terkunci]' : ''} ({formatRupiah(w.balance)})
                        </option>
                      ))}
                  </select>
                  {type === 'EXPENSE' && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      🔒 Kantong yang terkunci otomatis disembunyikan agar tabungan/dana darurat tidak terpakai belanja.
                    </p>
                  )}
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348] mt-1">
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

      {/* Daily Overbudget Warning Modal */}
      {overbudgetWarning.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Melebihi Batas Aman Harian
                </h3>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Peringatan Pengeluaran</span>
              </div>
            </div>

            <div className="space-y-3 my-4 p-4 rounded-xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>Batas Belanja Hari Ini:</span>
                <span className="font-mono font-bold text-green-600 dark:text-green-400">
                  {formatRupiah(overbudgetWarning.limit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>Nominal Pengeluaran:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {formatRupiah(overbudgetWarning.amount)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-[#2d3348] flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
                <span>Selisih Lebih (Overbudget):</span>
                <span className="font-mono text-amber-700 dark:text-amber-400">
                  + {formatRupiah(overbudgetWarning.excess)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              Pengeluaran ini akan mengurangi jatah belanja hari-hari berikutnya. Apakah Anda tetap ingin menyimpan transaksi ini?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOverbudgetWarning({ isOpen: false, amount: 0, limit: 0, excess: 0 })}
              >
                Batal &amp; Ubah Nominal
              </Button>
              <Button
                type="button"
                variant="glow"
                size="sm"
                loading={submitting}
                onClick={() => handleCreateTransaction(undefined, true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Tetap Lanjutkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApplyResult={handleApplyScanResult}
      />

      {/* 💰 Smart Payday Salary Allocation Modal */}
      <PaydayAllocationModal
        isOpen={isPaydayModalOpen}
        onClose={() => setIsPaydayModalOpen(false)}
        onSuccess={async () => {
          await refreshProfile()
          setRefreshTrigger((p) => p + 1)
        }}
        wallets={wallets}
        savingsGoals={savingsGoals}
        recurringBills={recurringBills}
      />

      {/* 🔔 Daily Spending Notification Prompt Modal */}
      <NotificationPromptModal
        isOpen={isNotifModalOpen}
        onClose={() => {
          setIsNotifModalOpen(false)
          try {
            // Snooze for 7 days
            localStorage.setItem(
              'saveme_notif_modal_snoozed',
              (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
            )
          } catch {
            // ignore
          }
        }}
        onSuccess={() => {
          setHasNotificationEnabled(true)
          try {
            localStorage.removeItem('saveme_notif_modal_snoozed')
          } catch {
            // ignore
          }
        }}
      />

      {/* 👥 Group Savings Invite Modal */}
      {activeGroupInviteModal && (
        <GroupSavingsInviteModal
          invite={activeGroupInviteModal.invite}
          group={activeGroupInviteModal.group}
          userId={user?.uid || ''}
          onClose={() => setActiveGroupInviteModal(null)}
          onResponded={() => {
            setActiveGroupInviteModal(null)
            setRefreshTrigger((p) => p + 1)
          }}
        />
      )}
    </div>
  )
}
