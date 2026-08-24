'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { savingsService, type CreateSavingsGoalDto } from '@/lib/services/savings.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import {
  Target,
  PlusCircle,
  PiggyBank,
  CheckCircle2,
  Sparkles,
  Pencil,
  Trash2,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  TrendingUp,
  Wallet as WalletIcon,
} from 'lucide-react'
import type { SavingsGoal, Wallet } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function SavingsPage() {
  const { user } = useAuth()

  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Add / Edit Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [submittingGoal, setSubmittingGoal] = useState(false)

  // Goal Form State
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('🎯')
  const [goalWalletId, setGoalWalletId] = useState('')
  const [goalError, setGoalError] = useState<string | null>(null)

  // Deposit / Withdraw Modal State
  const [depositModalGoal, setDepositModalGoal] = useState<SavingsGoal | null>(null)
  const [withdrawModalGoal, setWithdrawModalGoal] = useState<SavingsGoal | null>(null)
  const [amountAction, setAmountAction] = useState('')
  const [actionWalletId, setActionWalletId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const emojis = ['🎯', '💻', '🏖️', '🚗', '🏠', '📱', '🛡️', '💍', '🎓', '✈️', '🎮', '💼']

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [goalsData, userWallets] = await Promise.all([
          savingsService.getUserGoals(user.uid),
          walletService.getUserWallets(user.uid),
        ])

        if (isMounted) {
          setGoals(goalsData)
          setWallets(userWallets)
        }
      } catch (err) {
        console.error('[savings] Error loading goals & wallets:', err)
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

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Active Spending Wallets & Real Liquid Cash Balance
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked), [wallets])
  const liquidBalance = useMemo(
    () => spendingWallets.reduce((sum, w) => sum + w.balance, 0),
    [spendingWallets]
  )

  // Summary Metrics
  const totalTargetAll = useMemo(
    () => goals.reduce((sum, g) => sum + g.targetAmount, 0),
    [goals]
  )
  const totalCollectedAll = useMemo(
    () => goals.reduce((sum, g) => sum + g.currentAmount, 0),
    [goals]
  )
  const overallProgress =
    totalTargetAll > 0 ? Math.round((totalCollectedAll / totalTargetAll) * 100) : 0

  // Handle Save Goal (Create / Update)
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    setGoalError(null)

    const numTarget = Number(targetAmount)
    const numCurrent = Number(currentAmount) || 0

    if (!goalName.trim()) {
      setGoalError('Nama celengan impian wajib diisi')
      return
    }
    if (!numTarget || numTarget <= 0) {
      setGoalError('Target nominal harus lebih besar dari 0')
      return
    }

    if (!user?.uid) return

    setSubmittingGoal(true)
    try {
      if (editingGoal) {
        // UPDATE
        await savingsService.updateGoal(user.uid, editingGoal.id, {
          name: goalName,
          targetAmount: numTarget,
          currentAmount: numCurrent,
          targetDate,
          icon: selectedEmoji,
        })
      } else {
        // CREATE
        const selectedW =
          wallets.find((w) => w.id === goalWalletId) ||
          spendingWallets[0] ||
          wallets[0]

        const payload: CreateSavingsGoalDto = {
          name: goalName,
          targetAmount: numTarget,
          currentAmount: numCurrent,
          targetDate,
          icon: selectedEmoji,
        }
        await savingsService.createGoal(
          user.uid,
          payload,
          selectedW?.id,
          selectedW?.name
        )
      }

      setIsGoalModalOpen(false)
      setEditingGoal(null)
      setGoalName('')
      setTargetAmount('')
      setCurrentAmount('')
      setTargetDate('')
      setGoalWalletId('')
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[savings] Error saving goal:', err)
      const errObj = err as { message?: string }
      setGoalError(errObj.message || 'Gagal menyimpan target')
    } finally {
      setSubmittingGoal(false)
    }
  }

  // Handle Open Edit Goal
  const handleOpenEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal)
    setGoalName(goal.name)
    setTargetAmount(goal.targetAmount.toString())
    setCurrentAmount(goal.currentAmount.toString())
    setTargetDate(goal.targetDate || '')
    setSelectedEmoji(goal.icon || '🎯')
    setGoalError(null)
    setIsGoalModalOpen(true)
  }

  // Delete Goal Confirmation State
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null)
  const [isDeletingGoal, setIsDeletingGoal] = useState(false)

  const handleConfirmDeleteGoal = async () => {
    if (!user?.uid || !goalToDelete) return
    setIsDeletingGoal(true)

    try {
      await savingsService.deleteGoal(user.uid, goalToDelete)
      setGoalToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[savings] Error deleting goal:', err)
    } finally {
      setIsDeletingGoal(false)
    }
  }

  // Handle Open Deposit Modal
  const handleOpenDepositModal = (goal: SavingsGoal) => {
    setDepositModalGoal(goal)
    setAmountAction('')
    setActionError(null)
    setActionWalletId(spendingWallets[0]?.id || wallets[0]?.id || '')
  }

  // Handle Open Withdraw Modal
  const handleOpenWithdrawModal = (goal: SavingsGoal) => {
    setWithdrawModalGoal(goal)
    setAmountAction('')
    setActionError(null)
    setActionWalletId(spendingWallets[0]?.id || wallets[0]?.id || '')
  }

  // Handle Deposit (+ Setor Uang)
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!depositModalGoal || !user?.uid) return
    setActionError(null)

    const num = Number(amountAction)
    if (!num || num <= 0) {
      setActionError('Nominal setor harus lebih besar dari 0')
      return
    }

    const targetWallet =
      wallets.find((w) => w.id === actionWalletId) ||
      spendingWallets[0] ||
      wallets[0]

    if (!targetWallet) {
      setActionError('Silakan pilih dompet sumber dana')
      return
    }

    if (num > targetWallet.balance) {
      setActionError(
        `Saldo ${targetWallet.name} tidak mencukupi (Tersedia: ${formatRupiah(targetWallet.balance)})`
      )
      return
    }

    setActionLoading(true)
    try {
      await savingsService.depositToGoal(
        user.uid,
        depositModalGoal.id,
        num,
        targetWallet.id,
        targetWallet.name
      )
      setDepositModalGoal(null)
      setAmountAction('')
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setActionError(errObj.message || 'Gagal menyetor dana')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Withdraw (- Tarik Uang)
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!withdrawModalGoal || !user?.uid) return
    setActionError(null)

    const num = Number(amountAction)
    if (!num || num <= 0) {
      setActionError('Nominal tarik harus lebih besar dari 0')
      return
    }

    const targetWallet =
      wallets.find((w) => w.id === actionWalletId) ||
      spendingWallets[0] ||
      wallets[0]

    if (!targetWallet) {
      setActionError('Silakan pilih dompet tujuan penerimaan dana')
      return
    }

    setActionLoading(true)
    try {
      await savingsService.withdrawFromGoal(
        user.uid,
        withdrawModalGoal.id,
        num,
        targetWallet.id,
        targetWallet.name
      )
      setWithdrawModalGoal(null)
      setAmountAction('')
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setActionError(errObj.message || 'Gagal menarik dana')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Target className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Celengan Impian & Tabungan
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Wujudkan impian finansialmu dengan alokasi tabungan otomatis dari saldo dompet kasmu
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
            variant="glow"
            size="sm"
            onClick={() => {
              setEditingGoal(null)
              setGoalName('')
              setTargetAmount('')
              setCurrentAmount('')
              setTargetDate('')
              setSelectedEmoji('🎯')
              setGoalWalletId(spendingWallets[0]?.id || wallets[0]?.id || '')
              setIsGoalModalOpen(true)
            }}
            className="text-xs sm:text-sm px-3 sm:px-4"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Buat Celengan Impian
          </Button>
        </div>
      </div>

      {/* 4 Summary KPI Cards (Synchronized with Real Liquid Wallet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gradient-to-b dark:from-[#1e2333] dark:to-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Saldo Kas Bebas ({spendingWallets.length} Dompet)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-green-600 dark:text-green-400 tabular-nums">
              {formatRupiah(liquidBalance)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Siap dialokasikan / disetor
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
            <WalletIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Terkumpul di Celengan
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-purple-700 dark:text-purple-300 tabular-nums">
              {formatRupiah(totalCollectedAll)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {goals.length} pos impian aktif
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Total Target Impian
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-200 tabular-nums">
              {formatRupiah(totalTargetAll)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Akumulasi semua goal
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#21263a] text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Pencapaian Target
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {overallProgress}%
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {totalTargetAll > totalCollectedAll
                ? `Kurang ${formatRupiah(totalTargetAll - totalCollectedAll)}`
                : 'Tercapai 🎉'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Goals List / Grid */}
      {goals.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex flex-col items-center justify-center text-center shadow-md dark:shadow-xl">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Belum Ada Celengan Impian</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            Mulai rencanakan tujuan finansialmu hari ini! Contoh: Beli Laptop Baru, Dana Darurat 3 Bulan, Liburan, atau Beli Kendaraan.
          </p>
          <Button
            variant="glow"
            size="md"
            onClick={() => {
              setEditingGoal(null)
              setGoalWalletId(spendingWallets[0]?.id || wallets[0]?.id || '')
              setIsGoalModalOpen(true)
            }}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Buat Celengan Impian Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const pct =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0

            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

            // Calculate daily savings requirement if targetDate is set
            let dailySavingsReq = 0
            let daysLeft = 0
            if (goal.targetDate) {
              const today = new Date()
              const targetD = new Date(goal.targetDate)
              const diffTime = targetD.getTime() - today.getTime()
              daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              if (daysLeft > 0 && remaining > 0) {
                dailySavingsReq = Math.round(remaining / daysLeft)
              }
            }

            return (
              <div
                key={goal.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl flex flex-col justify-between transition-all hover:border-emerald-500/40 group text-slate-900 dark:text-white"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-2xl flex items-center justify-center shrink-0 shadow-inner">
                        {goal.icon || '🎯'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {goal.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          Target: {formatRupiah(goal.targetAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditGoal(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
                        title="Edit target"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoalToDelete(goal.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
                        title="Hapus target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Numbers */}
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Terkumpul:</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold font-mono text-green-600 dark:text-green-400">
                        {formatRupiah(goal.currentAmount)}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-[#21263a] rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>

                  {/* Target Date Calculation OR Friendly Motivational Feedback */}
                  {goal.targetDate && daysLeft > 0 && remaining > 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#21263a]/60 border border-slate-200 dark:border-[#2d3348] text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between mb-4">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Sisa {daysLeft} hari:</span>
                      </span>
                      <span className="font-bold font-mono text-purple-700 dark:text-purple-300 text-xs">
                        Nabung {formatRupiah(dailySavingsReq)}/hari
                      </span>
                    </div>
                  ) : !goal.targetDate && remaining > 0 ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-1 mb-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span>Jangan lupa nabung ya! ✨</span>
                      </div>
                      <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                        Ada wishlist impian yang belum kamu tabung nih (Kurang {formatRupiah(remaining)}). Atur target tanggal untuk menghitung jatah nabung harianmu.
                      </span>
                    </div>
                  ) : remaining === 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-bold text-[11px]">🎉 Target Celengan Impian ini telah tercapai 100%!</span>
                    </div>
                  ) : null}
                </div>

                {/* Deposit & Withdraw Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-[#2d3348] grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenDepositModal(goal)}
                    className="text-xs"
                    leftIcon={<ArrowUpRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />}
                  >
                    Setor Saldo
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenWithdrawModal(goal)}
                    className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    leftIcon={<ArrowDownLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  >
                    Tarik Uang
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Add / Edit Savings Goal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {editingGoal ? 'Edit Celengan Impian' : 'Buat Celengan Impian Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGoalModalOpen(false)
                  setEditingGoal(null)
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {goalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {goalError}
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="flex flex-col gap-3.5 sm:gap-4">
              <FormField label="Nama Impian / Tujuan Tabungan" required>
                <Input
                  placeholder="Contoh: Beli Laptop M3 / Dana Darurat 3 Bulan"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                />
              </FormField>

              {/* Emoji Selector */}
              <FormField label="Pilih Ikon Emoji">
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-[#21263a] rounded-xl border border-slate-200 dark:border-[#2d3348]">
                  {emojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setSelectedEmoji(em)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer',
                        selectedEmoji === em
                          ? 'bg-emerald-500/30 border border-emerald-500 scale-110'
                          : 'hover:bg-slate-100 dark:hover:bg-[#1a1d27]'
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Target Nominal yang Ingin Dicapai (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 15000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <FormField label="Saldo Awal Terkumpul (Rp)">
                  <Input
                    type="number"
                    placeholder="Contoh: 1000000"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </FormField>

                <FormField label="Target Tanggal Tercapai (Opsional)">
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Wallet Selector if Initial Deposit is set */}
              {!editingGoal && Number(currentAmount) > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Dompet Sumber Saldo Awal:
                  </label>
                  <select
                    value={goalWalletId}
                    onChange={(e) => setGoalWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-green-500"
                  >
                    {spendingWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} — Saldo: {formatRupiah(w.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348] mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setIsGoalModalOpen(false)
                    setEditingGoal(null)
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  loading={submittingGoal}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {editingGoal ? 'Simpan Perubahan' : 'Simpan Celengan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Deposit (+ Setor) */}
      {depositModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Setor ke: {depositModalGoal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDepositModalGoal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleDeposit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Dompet Sumber Dana:
                </label>
                <select
                  value={actionWalletId}
                  onChange={(e) => setActionWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-green-500"
                >
                  {spendingWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — Saldo: {formatRupiah(w.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <FormField label="Nominal Setor ke Celengan (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 100000"
                  value={amountAction}
                  onChange={(e) => setAmountAction(e.target.value)}
                  autoFocus
                  required
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setDepositModalGoal(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  loading={actionLoading}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Konfirmasi Setor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Withdraw (- Tarik) */}
      {withdrawModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Tarik dari: {withdrawModalGoal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawModalGoal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs text-slate-700 dark:text-slate-300 mb-4 flex justify-between">
              <span>Saldo di Celengan Saat Ini:</span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                {formatRupiah(withdrawModalGoal.currentAmount)}
              </span>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Dompet Tujuan Penerimaan Dana:
                </label>
                <select
                  value={actionWalletId}
                  onChange={(e) => setActionWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-green-500"
                >
                  {spendingWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — Saldo Sekarang: {formatRupiah(w.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <FormField label="Nominal Tarik ke Dompet (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={amountAction}
                  onChange={(e) => setAmountAction(e.target.value)}
                  autoFocus
                  required
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setWithdrawModalGoal(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  loading={actionLoading}
                  className="text-amber-700 dark:text-amber-400"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Konfirmasi Tarik
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Savings Goal */}
      <ConfirmModal
        isOpen={Boolean(goalToDelete)}
        title="Hapus Celengan Impian?"
        description="Apakah Anda yakin ingin menghapus celengan impian ini? Progres tabungan pada pos ini akan dihapus permanen."
        confirmText="Hapus Celengan"
        cancelText="Batal"
        variant="danger"
        loading={isDeletingGoal}
        onConfirm={handleConfirmDeleteGoal}
        onClose={() => setGoalToDelete(null)}
      />
    </div>
  )
}
