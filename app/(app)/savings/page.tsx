'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { savingsService, type CreateSavingsGoalDto } from '@/lib/services/savings.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { groupSavingsService, type VerifiedUserProfile } from '@/lib/services/group-savings.firebase'
import { calculateSavingsFeasibility } from '@/lib/utils/financial-feasibility'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { GroupSavingsCard } from '@/components/organisms/GroupSavingsCard'
import { GroupSavingsInviteModal } from '@/components/organisms/GroupSavingsInviteModal'
import { Skeleton } from '@/components/atoms/Skeleton'
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
  Users,
  Bell,
  UserPlus,
  Mail,
  Percent,
  UserCheck,
  AlertCircle,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import type { SavingsGoal, Wallet, GroupSavings, GroupSavingsMember } from '@/types'
import { cn } from '@/lib/utils/cn'

type SavingsTab = 'pribadi' | 'bersama' | 'undangan'

export interface MultiInviteeRow {
  id: string
  email: string
  percentage: number
  verifiedUser: VerifiedUserProfile | null
  checking: boolean
  error: string | null
}

export default function SavingsPage() {
  const { user, userProfile } = useAuth()

  const [activeTab, setActiveTab] = useState<SavingsTab>('pribadi')

  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Group Savings State
  const [groupSavings, setGroupSavings] = useState<{
    group: GroupSavings
    member: GroupSavingsMember
    allMembers: GroupSavingsMember[]
  }[]>([])
  const [pendingInvites, setPendingInvites] = useState<{
    invite: GroupSavingsMember
    group: GroupSavings
  }[]>([])
  const [activeInviteModal, setActiveInviteModal] = useState<{
    invite: GroupSavingsMember
    group: GroupSavings
  } | null>(null)

  // Create Group Modal State (Multi-Person Dynamic Split)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupIcon, setNewGroupIcon] = useState('🏝️')
  const [newGroupTarget, setNewGroupTarget] = useState('')
  const [newGroupDate, setNewGroupDate] = useState('')
  const [hostPercentage, setHostPercentage] = useState<number>(40)
  const [newGroupInvitees, setNewGroupInvitees] = useState<MultiInviteeRow[]>([
    {
      id: 'inv-1',
      email: '',
      percentage: 30,
      verifiedUser: null,
      checking: false,
      error: null,
    },
    {
      id: 'inv-2',
      email: '',
      percentage: 30,
      verifiedUser: null,
      checking: false,
      error: null,
    },
  ])
  const [newGroupError, setNewGroupError] = useState<string | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Invite Member Modal State (from existing group)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteGroupId, setInviteGroupId] = useState('')
  const [inviteGroupTarget, setInviteGroupTarget] = useState(0)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePercentage, setInvitePercentage] = useState('20')
  const [inviteVerifiedUser, setInviteVerifiedUser] = useState<VerifiedUserProfile | null>(null)
  const [inviteChecking, setInviteChecking] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Individual Goal Add / Edit Modal State
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

  // Individual Deposit / Withdraw Modal State
  const [depositModalGoal, setDepositModalGoal] = useState<SavingsGoal | null>(null)
  const [withdrawModalGoal, setWithdrawModalGoal] = useState<SavingsGoal | null>(null)
  const [amountAction, setAmountAction] = useState('')
  const [actionWalletId, setActionWalletId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [depositStartDate, setDepositStartDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [useCustomStartDate, setUseCustomStartDate] = useState(false)

  // Delete Goal Confirmation State
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null)
  const [isDeletingGoal, setIsDeletingGoal] = useState(false)

  // Milestone Toast State
  const [milestoneToast, setMilestoneToast] = useState<{
    emoji: string
    message: string
  } | null>(null)

  const emojis = ['🎯', '💻', '🏖️', '🚗', '🏠', '📱', '🛡️', '💍', '🎓', '✈️', '🎮', '💼']
  const groupEmojis = ['🏝️', '✈️', '🏠', '🚗', '🍔', '🎉', '🎁', '💼', '⚽', '🎸', '🏖️', '🎯']

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [goalsData, userWallets, groupSavingsData, pendingInvitesData] = await Promise.all([
          savingsService.getUserGoals(user.uid),
          walletService.getUserWallets(user.uid),
          groupSavingsService.getUserGroups(user.uid),
          groupSavingsService.getPendingInvites(user.uid),
        ])

        if (isMounted) {
          setGoals(goalsData)
          setWallets(userWallets)
          setGroupSavings(groupSavingsData)
          setPendingInvites(pendingInvitesData)
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

  // Summary Metrics (Individual)
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

  // Summary Metrics (Group Savings)
  const totalGroupTarget = useMemo(
    () => groupSavings.reduce((sum, g) => sum + g.group.targetAmount, 0),
    [groupSavings]
  )
  const totalGroupContributed = useMemo(
    () => groupSavings.reduce((sum, g) => sum + g.allMembers.reduce((ms, m) => ms + (m.myContributed || 0), 0), 0),
    [groupSavings]
  )
  const myTotalGroupContributed = useMemo(
    () => groupSavings.reduce((sum, g) => sum + (g.member.myContributed || 0), 0),
    [groupSavings]
  )

  // Total allocated percentage in create group modal
  const totalAllocatedPercentage = useMemo(() => {
    const host = Number(hostPercentage) || 0
    const inviteesSum = newGroupInvitees.reduce((sum, inv) => sum + (Number(inv.percentage) || 0), 0)
    return host + inviteesSum
  }, [hostPercentage, newGroupInvitees])

  // Real-time Feasibility Calculation for Individual Goal Modal
  const individualFeasibility = useMemo(() => {
    const num = Number(targetAmount)
    if (!num || num <= 0) return null
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysLeftInMonth = Math.max(1, lastDay - now.getDate() + 1)
    return calculateSavingsFeasibility(num, targetDate, liquidBalance, daysLeftInMonth)
  }, [targetAmount, targetDate, liquidBalance])

  // Real-time Feasibility Calculation for Group Savings Host Share
  const groupHostFeasibility = useMemo(() => {
    const total = Number(newGroupTarget.replace(/\D/g, ''))
    if (!total || total <= 0) return null
    const hostTarget = Math.round((total * (Number(hostPercentage) || 0)) / 100)
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysLeftInMonth = Math.max(1, lastDay - now.getDate() + 1)
    return calculateSavingsFeasibility(hostTarget, newGroupDate, liquidBalance, daysLeftInMonth)
  }, [newGroupTarget, hostPercentage, newGroupDate, liquidBalance])

  // ── Real-time Deposit Preview ─────────────────────────────────────────────
  // Calculates what will happen AFTER the deposit — shown live in Deposit Modal
  const depositPreview = useMemo(() => {
    if (!depositModalGoal) return null
    const depositAmount = Number(amountAction)
    if (!depositAmount || depositAmount <= 0) return null

    const newCurrent = depositModalGoal.currentAmount + depositAmount
    const newRemaining = Math.max(0, depositModalGoal.targetAmount - newCurrent)
    const newPct =
      depositModalGoal.targetAmount > 0
        ? Math.min(100, Math.round((newCurrent / depositModalGoal.targetAmount) * 100))
        : 0

    const effectiveStartDate = useCustomStartDate
      ? depositStartDate
      : new Date().toISOString().split('T')[0]

    let targetDateFormatted = ''
    if (depositModalGoal.targetDate) {
      try {
        targetDateFormatted = new Date(depositModalGoal.targetDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      } catch {
        targetDateFormatted = depositModalGoal.targetDate
      }
    }

    if (newPct >= 100) {
      return {
        newCurrent,
        newRemaining: 0,
        newPct: 100,
        newDailyTarget: 0,
        savingDays: 0,
        effectiveStartDate,
        targetDateFormatted,
        isGoalReached: true,
        isStartAfterTarget: false,
        isStartInPast: false,
        isTight: false,
        hasTargetDate: !!depositModalGoal.targetDate,
      }
    }

    // --- Calculate new daily target based on effective start date ---
    let newDailyTarget = 0
    let savingDays = 0
    let isStartAfterTarget = false
    let isStartInPast = false
    let isTight = false

    if (depositModalGoal.targetDate && newRemaining > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const startD = new Date(effectiveStartDate)
      startD.setHours(0, 0, 0, 0)

      const targetD = new Date(depositModalGoal.targetDate)
      targetD.setHours(0, 0, 0, 0)

      // Cek apakah tanggal mulai yang dipilih di masa lalu
      if (useCustomStartDate && startD.getTime() < today.getTime()) {
        isStartInPast = true
      }

      const diffMs = targetD.getTime() - startD.getTime()
      savingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (savingDays <= 0) {
        isStartAfterTarget = true
      } else if (!isStartInPast) {
        newDailyTarget = Math.round(newRemaining / savingDays)
        isTight = newDailyTarget > 500_000
      }
    }

    return {
      newCurrent,
      newRemaining,
      newPct,
      newDailyTarget,
      savingDays,
      effectiveStartDate,
      targetDateFormatted,
      isGoalReached: false,
      isStartAfterTarget,
      isStartInPast,
      isTight,
      hasTargetDate: !!depositModalGoal.targetDate,
    }
  }, [depositModalGoal, amountAction, depositStartDate, useCustomStartDate])



  // Client-side Email Regex Validation Helper
  const isValidEmailFormat = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  // Handle Invitee Email Text Input (Client-only state update, NO Firestore hits)
  const handleInviteeEmailChange = (id: string, rawEmail: string) => {
    const email = rawEmail.trim()
    setNewGroupInvitees((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              email,
              verifiedUser: null, // reset verified status when typing
              checking: false,
              error: null,
            }
          : row
      )
    )
  }

  // Manual Trigger: Check Invitee Email in Firestore
  const handleCheckInviteeEmail = async (id: string) => {
    const targetRow = newGroupInvitees.find((r) => r.id === id)
    if (!targetRow) return
    const email = targetRow.email.trim().toLowerCase()

    if (!email) {
      setNewGroupInvitees((prev) =>
        prev.map((r) => (r.id === id ? { ...r, error: 'Masukkan email teman terlebih dahulu' } : r))
      )
      return
    }

    if (!isValidEmailFormat(email)) {
      setNewGroupInvitees((prev) =>
        prev.map((r) => (r.id === id ? { ...r, error: 'Format email tidak valid (contoh: nama@domain.com)' } : r))
      )
      return
    }

    if (email === user?.email?.toLowerCase()) {
      setNewGroupInvitees((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                verifiedUser: null,
                checking: false,
                error: 'Ini adalah email akunmu sendiri (kamu adalah Host)',
              }
            : r
        )
      )
      return
    }

    // Check for duplicate in current list
    const duplicate = newGroupInvitees.some((r) => r.id !== id && r.email.toLowerCase() === email)
    if (duplicate) {
      setNewGroupInvitees((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                verifiedUser: null,
                checking: false,
                error: 'Email ini sudah ada di daftar anggota',
              }
            : r
        )
      )
      return
    }

    setNewGroupInvitees((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checking: true, error: null } : r))
    )

    try {
      const verified = await groupSavingsService.verifyUserByEmail(email)
      setNewGroupInvitees((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                checking: false,
                verifiedUser: verified,
                error: verified
                  ? null
                  : 'Email ini belum terdaftar di SaveMe. Minta kawanmu mendaftar dulu ya!',
              }
            : r
        )
      )
    } catch {
      setNewGroupInvitees((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, checking: false, error: 'Gagal memverifikasi akun' } : r
        )
      )
    }
  }

  // Manual Trigger: Check Single Invite Email in Firestore (Existing Group)
  const handleCheckSingleInviteEmail = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      setInviteError('Masukkan email teman terlebih dahulu')
      return
    }
    if (!isValidEmailFormat(email)) {
      setInviteError('Format email tidak valid (contoh: nama@domain.com)')
      return
    }
    if (email === user?.email?.toLowerCase()) {
      setInviteError('Ini adalah email akunmu sendiri')
      return
    }

    setInviteChecking(true)
    setInviteError(null)
    try {
      const verified = await groupSavingsService.verifyUserByEmail(email)
      setInviteVerifiedUser(verified)
      if (!verified) {
        setInviteError('Email ini belum terdaftar di SaveMe. Pastikan kawanmu sudah mendaftar.')
      }
    } catch {
      setInviteError('Gagal memverifikasi akun')
    } finally {
      setInviteChecking(false)
    }
  }

  // Dynamic Add / Remove Invitee Row
  const handleAddInviteeRow = () => {
    const newId = `inv-${Date.now()}`
    setNewGroupInvitees((prev) => [
      ...prev,
      {
        id: newId,
        email: '',
        percentage: 10,
        verifiedUser: null,
        checking: false,
        error: null,
      },
    ])
  }

  const handleRemoveInviteeRow = (id: string) => {
    setNewGroupInvitees((prev) => prev.filter((r) => r.id !== id))
  }

  // Auto Equal Split Button
  const handleAutoEqualSplit = () => {
    const totalPeople = 1 + newGroupInvitees.length
    const equalShare = Math.floor(100 / totalPeople)
    const remainder = 100 - equalShare * totalPeople
    setHostPercentage(equalShare + remainder)
    setNewGroupInvitees((prev) =>
      prev.map((row) => ({ ...row, percentage: equalShare }))
    )
  }

  // ── Handle Save Goal (Create / Update Individual) ──────────────────────────
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
        await savingsService.updateGoal(user.uid, editingGoal.id, {
          name: goalName,
          targetAmount: numTarget,
          currentAmount: numCurrent,
          targetDate,
          icon: selectedEmoji,
        })
      } else {
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

  const handleOpenDepositModal = (goal: SavingsGoal) => {
    setDepositModalGoal(goal)
    setAmountAction('')
    setActionError(null)
    setActionWalletId(spendingWallets[0]?.id || wallets[0]?.id || '')
    setDepositStartDate(new Date().toISOString().split('T')[0])
    setUseCustomStartDate(false)
  }

  const handleOpenWithdrawModal = (goal: SavingsGoal) => {
    setWithdrawModalGoal(goal)
    setAmountAction('')
    setActionError(null)
    setActionWalletId(spendingWallets[0]?.id || wallets[0]?.id || '')
  }

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

    // Capture milestone state BEFORE deposit for comparison
    const prevPct =
      depositModalGoal.targetAmount > 0
        ? Math.round((depositModalGoal.currentAmount / depositModalGoal.targetAmount) * 100)
        : 0
    const newPctAfter =
      depositModalGoal.targetAmount > 0
        ? Math.min(100, Math.round(((depositModalGoal.currentAmount + num) / depositModalGoal.targetAmount) * 100))
        : 0

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

      // Show milestone toast if a milestone was crossed
      const milestones = [
        { threshold: 100, emoji: '🎉', message: `Target "${depositModalGoal.name}" tercapai! Impianmu terwujud!` },
        { threshold: 75, emoji: '🔥', message: `75% tercapai! Tinggal sedikit lagi untuk "${depositModalGoal.name}"!` },
        { threshold: 50, emoji: '⚡', message: `Sudah 50%! Kamu di jalur yang tepat untuk "${depositModalGoal.name}"!` },
        { threshold: 25, emoji: '🌱', message: `25% terkumpul! Awal yang bagus untuk "${depositModalGoal.name}"!` },
      ]
      for (const m of milestones) {
        if (prevPct < m.threshold && newPctAfter >= m.threshold) {
          setMilestoneToast({ emoji: m.emoji, message: m.message })
          setTimeout(() => setMilestoneToast(null), 5000)
          break
        }
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setActionError(errObj.message || 'Gagal menyetor dana')
    } finally {
      setActionLoading(false)
    }
  }

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

  // ── Handle Create Group Savings with Multi-Person & Verification ──────────
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewGroupError(null)

    const target = Number(newGroupTarget.replace(/\D/g, ''))
    if (!newGroupName.trim()) {
      setNewGroupError('Nama celengan bersama wajib diisi')
      return
    }
    if (!target || target <= 0) {
      setNewGroupError('Target nominal harus lebih besar dari 0')
      return
    }

    if (totalAllocatedPercentage !== 100) {
      setNewGroupError(
        `Total persentase harus tepat 100% (Saat ini: ${totalAllocatedPercentage}%). Sesuaikan porsi atau klik "Bagi Rata Otomatis".`
      )
      return
    }

    // Validate that all entered invitees have verified accounts
    const activeInvitees = newGroupInvitees.filter((inv) => inv.email.trim().length > 0)
    for (const inv of activeInvitees) {
      if (!inv.verifiedUser) {
        setNewGroupError(
          `Anggota dengan email "${inv.email}" belum terverifikasi di SaveMe. Hapus atau ganti dengan email terdaftar.`
        )
        return
      }
    }

    if (!user?.uid) return
    setCreatingGroup(true)
    try {
      await groupSavingsService.createGroupWithMultiMembers(
        user.uid,
        userProfile?.name || user.email?.split('@')[0] || 'Kamu (Host)',
        user.email || '',
        {
          name: newGroupName,
          icon: newGroupIcon,
          targetAmount: target,
          targetDate: newGroupDate,
        },
        hostPercentage,
        activeInvitees.map((inv) => ({
          userId: inv.verifiedUser!.uid,
          displayName: inv.verifiedUser!.name,
          email: inv.verifiedUser!.email,
          percentage: Number(inv.percentage),
        }))
      )

      setIsCreateGroupOpen(false)
      setNewGroupName('')
      setNewGroupTarget('')
      setNewGroupDate('')
      setHostPercentage(40)
      setNewGroupInvitees([
        { id: 'inv-1', email: '', percentage: 30, verifiedUser: null, checking: false, error: null },
        { id: 'inv-2', email: '', percentage: 30, verifiedUser: null, checking: false, error: null },
      ])
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setNewGroupError(errObj.message || 'Gagal membuat celengan bersama')
    } finally {
      setCreatingGroup(false)
    }
  }

  // ── Handle Invite Member (from existing group) ────────────────────────────
  const handleOpenInviteModal = (groupId: string, targetAmount: number) => {
    setInviteGroupId(groupId)
    setInviteGroupTarget(targetAmount)
    setInviteEmail('')
    setInvitePercentage('20')
    setInviteVerifiedUser(null)
    setInviteChecking(false)
    setInviteError(null)
    setIsInviteOpen(true)
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !inviteGroupId) return
    setInviteError(null)

    if (!inviteEmail.trim() || !inviteVerifiedUser) {
      setInviteError('Masukkan email kawan yang terdaftar di SaveMe')
      return
    }
    const pct = Number(invitePercentage)
    if (!pct || pct <= 0 || pct > 100) {
      setInviteError('Persentase harus antara 1% - 100%')
      return
    }

    setInviteLoading(true)
    try {
      await groupSavingsService.inviteMember(
        inviteGroupId,
        user.uid,
        {
          userId: inviteVerifiedUser.uid,
          displayName: inviteVerifiedUser.name,
          email: inviteVerifiedUser.email,
          percentage: pct,
        },
        inviteGroupTarget
      )

      setIsInviteOpen(false)
      setInviteEmail('')
      setInvitePercentage('20')
      setInviteVerifiedUser(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setInviteError(errObj.message || 'Gagal mengirim undangan')
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Handle Respond to Invite (from Undangan tab) ──────────────────────────
  const handleRespondInvite = async (memberId: string, response: 'ACCEPTED' | 'REJECTED') => {
    if (!user?.uid) return
    try {
      await groupSavingsService.respondToInvite(memberId, user.uid, response)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('Error responding invite:', err)
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
                Wujudkan impian finansialmu secara mandiri atau patungan bersama teman & keluarga
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

          {activeTab === 'pribadi' && (
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
          )}

          {activeTab === 'bersama' && (
            <Button
              variant="glow"
              size="sm"
              onClick={() => {
                setNewGroupName('')
                setNewGroupTarget('')
                setNewGroupDate('')
                setNewGroupIcon('🏝️')
                setHostPercentage(40)
                setNewGroupInvitees([
                  { id: 'inv-1', email: '', percentage: 30, verifiedUser: null, checking: false, error: null },
                  { id: 'inv-2', email: '', percentage: 30, verifiedUser: null, checking: false, error: null },
                ])
                setNewGroupError(null)
                setIsCreateGroupOpen(true)
              }}
              className="text-xs sm:text-sm px-3 sm:px-4"
              leftIcon={<Users className="w-4 h-4" />}
            >
              Buat Celengan Bersama
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] self-start flex-wrap">
        <button
          onClick={() => setActiveTab('pribadi')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer',
            activeTab === 'pribadi'
              ? 'bg-white dark:bg-[#1e2333] text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-[#2d3348]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Target className="w-4 h-4" />
          <span>Celengan Pribadi</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-[#21263a] font-mono">
            {goals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bersama')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer',
            activeTab === 'bersama'
              ? 'bg-white dark:bg-[#1e2333] text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-[#2d3348]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Celengan Bersama</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            {groupSavings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('undangan')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer relative',
            activeTab === 'undangan'
              ? 'bg-white dark:bg-[#1e2333] text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-[#2d3348]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Bell className="w-4 h-4" />
          <span>Undangan Masuk</span>
          {pendingInvites.length > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse font-mono">
              {pendingInvites.length}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-[#21263a] font-mono">
              0
            </span>
          )}
        </button>
      </div>

      {/* ════════════════════ TAB 1: CELENGAN PRIBADI ════════════════════ */}
      {activeTab === 'pribadi' && (
        loading && goals.length === 0 ? (
            <div className="space-y-6">
              {/* 4 Summary KPI Skeletons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-xs flex items-center justify-between"
                  >
                    <div className="space-y-2.5 w-3/4">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-7 w-36" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="w-10 h-10 rounded-2xl" />
                  </div>
                ))}
              </div>

              {/* Grid of 3 Goal Card Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-xs flex flex-col justify-between space-y-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-12 h-12 rounded-2xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="w-12 h-6 rounded-lg" />
                      </div>

                      <div className="space-y-2.5 mb-4">
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                        <Skeleton className="h-2.5 w-full rounded-full" />
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-white/8">
                      <Skeleton className="h-9 rounded-xl" />
                      <Skeleton className="h-9 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* 4 Summary KPI Cards */}
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
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                  {formatRupiah(totalCollectedAll)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Dari {goals.length} target impian
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
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
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
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Target Info */}
                      <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100 dark:border-[#2d3348]/60 text-xs text-slate-600 dark:text-slate-400">
                        {goal.targetDate ? (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Target Waktu:
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-200">
                              {new Date(goal.targetDate).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {daysLeft > 0 ? (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({daysLeft} hari lagi)
                                </span>
                              ) : (
                                <span className="text-[10px] text-red-500 ml-1 font-semibold">
                                  (Lewat tempo)
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Target Waktu:</span>
                            <span>Fleksibel (Tanpa batas)</span>
                          </div>
                        )}

                        {dailySavingsReq > 0 && pct < 100 && (
                          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              Wajib Nabung:
                            </span>
                            <span className="font-mono font-bold">
                              {formatRupiah(dailySavingsReq)}/hari
                            </span>
                          </div>
                        )}

                        {pct >= 100 && (
                          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold mt-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Target Berhasil Dicapai! 🎉
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Setor & Tarik */}
                    <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-[#2d3348]">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDepositModal(goal)}
                        className="text-xs flex items-center justify-center gap-1"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        Setor Uang
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={goal.currentAmount <= 0}
                        onClick={() => handleOpenWithdrawModal(goal)}
                        className="text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-[#2d3348]"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Tarik Uang
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ))}

      {/* ════════════════════ TAB 2: CELENGAN BERSAMA ════════════════════ */}
      {activeTab === 'bersama' && (
        <div className="space-y-6">
          {loading && groupSavings.length === 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-xs flex items-center justify-between"
                  >
                    <div className="space-y-2.5 w-3/4">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-7 w-36" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="w-10 h-10 rounded-2xl" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-2xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full rounded-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Summary KPIs for Group Savings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Celengan Bersama Aktif
                    </span>
                    <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                      {groupSavings.length} Grup
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Patungan bareng kawan & keluarga
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Setoran Kamu di Grup
                    </span>
                    <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(myTotalGroupContributed)}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Komitmen yang sudah kamu setor
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Total Target Gabungan
                    </span>
                    <div className="text-2xl font-extrabold font-mono text-purple-600 dark:text-purple-400">
                      {formatRupiah(totalGroupTarget)}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Terkumpul gabungan: {formatRupiah(totalGroupContributed)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Group Savings Grid */}
              {groupSavings.length === 0 ? (
                <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex flex-col items-center justify-center text-center shadow-md">
                  <div className="text-5xl mb-4">👥</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    Belum Ada Celengan Bersama
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                    Mau liburan bareng teman? Beli kado patungan? Atau sewa tempat bersama? Buat celengan bersama, tentukan persentase bagian masing-masing, dan pantau history setorannya bersama!
                  </p>
                  <Button
                    variant="glow"
                    size="md"
                    onClick={() => {
                      setNewGroupName('')
                      setNewGroupTarget('')
                      setNewGroupDate('')
                      setNewGroupIcon('🏝️')
                      setHostPercentage(40)
                      setNewGroupInvitees([
                        { id: 'inv-1', email: '', percentage: 30, verifiedUser: null, checking: false, error: null },
                        { id: 'inv-2', email: '', percentage: 30, verifiedUser: null, checking: false, error: null },
                      ])
                      setNewGroupError(null)
                      setIsCreateGroupOpen(true)
                    }}
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                  >
                    Buat Celengan Bersama Pertama
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {groupSavings.map((item) => (
                    <div key={item.group.id} className="flex flex-col gap-2">
                      <GroupSavingsCard
                        group={item.group}
                        myMember={item.member}
                        allMembers={item.allMembers}
                        onRefresh={() => setRefreshTrigger((p) => p + 1)}
                      />
                      {/* Creator extra action: Invite member */}
                      {item.group.createdBy === user?.uid && item.group.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleOpenInviteModal(item.group.id, item.group.targetAmount)}
                          className="self-end text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 px-2 py-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          + Undang Anggota Baru
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════ TAB 3: UNDANGAN MASUK ════════════════════ */}
      {activeTab === 'undangan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Daftar Undangan Celengan Bersama
            </h3>
            <span className="text-xs text-slate-500">
              {pendingInvites.length} undangan menunggu respon
            </span>
          </div>

          {loading && pendingInvites.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">📬</div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Tidak Ada Undangan Masuk
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Jika temanmu mengundangmu ke celengan bersama via email akunmu, undangannya akan muncul di sini untuk kamu terima atau tolak.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingInvites.map(({ invite, group }) => {
                const now = new Date()
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                const daysLeft = Math.max(1, lastDay - now.getDate() + 1)
                const feas = calculateSavingsFeasibility(invite.myTarget, group.targetDate, liquidBalance, daysLeft)
                const isDef = !feas.isFeasible && !feas.isTight

                return (
                  <div
                    key={invite.id}
                    className={cn(
                      'p-5 rounded-2xl bg-white dark:bg-[#1a1d27] shadow-sm flex flex-col justify-between gap-4 border',
                      isDef ? 'border-rose-300 dark:border-rose-800/60' : 'border-amber-200 dark:border-amber-500/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 shrink-0">
                        {group.icon || '🎯'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Undangan Baru
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {group.name}
                        </h4>
                        <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Target Total:</span>
                            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                              {formatRupiah(group.targetAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Bagian Kamu:</span>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              {invite.percentage}% = {formatRupiah(invite.myTarget)}
                            </span>
                          </div>
                          {group.targetDate && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Deadline:</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {new Date(group.targetDate).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isDef && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300">
                        ⚠️ <strong>Peringatan Kas:</strong> Butuh {formatRupiah(feas.dailyRequired)}/hari, sedangkan kapasitas kasmu {formatRupiah(feas.dailyCapacity)}/hari (Defisit {formatRupiah(feas.deficitPerDay)}/hari).
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#2d3348]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40"
                        onClick={() => handleRespondInvite(invite.id, 'REJECTED')}
                      >
                        ❌ Tolak
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRespondInvite(invite.id, 'ACCEPTED')}
                      >
                        ✅ Terima
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ MODAL: BUAT CELENGAN BERSAMA (MULTI-PERSON DYNAMIC SPLIT) ════════════════════ */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{newGroupIcon}</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Buat Celengan Bersama
                  </h3>
                  <p className="text-xs text-slate-500">Patungan &amp; atur persentase banyak orang</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newGroupError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{newGroupError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
              {/* Emoji selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Pilih Ikon:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {groupEmojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewGroupIcon(em)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer',
                        newGroupIcon === em
                          ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-sm scale-110'
                          : 'bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] hover:bg-slate-200'
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Nama Celengan Bersama" required>
                <Input
                  placeholder="Contoh: Liburan Bali Bareng 🏝️"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Target Total (Rp)" required>
                  <Input
                    type="number"
                    placeholder="Contoh: 10000000"
                    value={newGroupTarget}
                    onChange={(e) => setNewGroupTarget(e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Target Tanggal (Deadline)">
                  <Input
                    type="date"
                    value={newGroupDate}
                    onChange={(e) => setNewGroupDate(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Live Feasibility Check for Host */}
              {groupHostFeasibility && Number(newGroupTarget) > 0 && newGroupDate && (
                <div
                  className={cn(
                    'p-3.5 rounded-2xl border text-xs space-y-2',
                    !groupHostFeasibility.isFeasible && !groupHostFeasibility.isTight
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
                      : groupHostFeasibility.isTight
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  )}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {!groupHostFeasibility.isFeasible && !groupHostFeasibility.isTight ? (
                        <>⚠️ Peringatan Kapasitas Kas (Defisit {formatRupiah(groupHostFeasibility.deficitPerDay)}/hari)</>
                      ) : groupHostFeasibility.isTight ? (
                        <>⚡ Target Cukup Ketat</>
                      ) : (
                        <>🛡️ Target Aman & Realistis</>
                      )}
                    </span>
                    <span className="font-mono">
                      Wajib: {formatRupiah(groupHostFeasibility.dailyRequired)}/hari
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {groupHostFeasibility.advice}
                  </p>
                  {!groupHostFeasibility.isFeasible && !groupHostFeasibility.isTight && (
                    <button
                      type="button"
                      onClick={() => setNewGroupDate(groupHostFeasibility.suggestedSafeDate)}
                      className="w-full mt-1 py-1.5 px-3 rounded-xl bg-white dark:bg-[#1a1d27] border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Terapkan Deadline Aman ({new Date(groupHostFeasibility.suggestedSafeDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </button>
                  )}
                </div>
              )}

              {/* ═════════ SECTION: PEMBAGIAN MULTI-PERSON & VALIDASI EMAIL ═════════ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Percent className="w-4 h-4 text-emerald-500" />
                    Pembagian Porsi Anggota ({1 + newGroupInvitees.length} Orang)
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoEqualSplit}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    ⚖️ Bagi Rata Otomatis
                  </button>
                </div>

                {/* Visual Allocation Meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Status Alokasi Porsi:</span>
                    <span
                      className={cn(
                        'font-bold font-mono',
                        totalAllocatedPercentage === 100
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : totalAllocatedPercentage < 100
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {totalAllocatedPercentage}% / 100%{' '}
                      {totalAllocatedPercentage === 100
                        ? '✅ Pas'
                        : totalAllocatedPercentage < 100
                        ? `(Kurang ${100 - totalAllocatedPercentage}%)`
                        : `(Kelebihan ${totalAllocatedPercentage - 100}%)`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 dark:bg-[#21263a] rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, hostPercentage)}%` }}
                      title={`Kamu: ${hostPercentage}%`}
                    />
                    {newGroupInvitees.map((inv, idx) => {
                      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500']
                      return (
                        <div
                          key={inv.id}
                          className={cn('h-full transition-all duration-300', colors[idx % colors.length])}
                          style={{ width: `${Math.min(100, Number(inv.percentage) || 0)}%` }}
                          title={`Teman ${idx + 1}: ${inv.percentage}%`}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* 1. Host Row */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1d27] border border-emerald-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {userProfile?.name?.charAt(0).toUpperCase() || 'H'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {userProfile?.name || 'Kamu'} (Host)
                        </span>
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-bold">
                          Pembuat
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{user?.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={hostPercentage}
                        onChange={(e) => setHostPercentage(Number(e.target.value))}
                        className="w-16 h-8 text-center text-xs font-bold font-mono"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                    {Number(newGroupTarget) > 0 && (
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 w-28 text-right">
                        {formatRupiah(Math.round((Number(newGroupTarget) * hostPercentage) / 100))}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Invitee Rows */}
                <div className="space-y-3">
                  {newGroupInvitees.map((inv, index) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Teman #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInviteeRow(inv.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                          title="Hapus teman ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1 flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <Input
                              type="email"
                              placeholder="email.kawan@gmail.com"
                              className="pl-9 h-9 text-xs"
                              value={inv.email}
                              onChange={(e) => handleInviteeEmailChange(inv.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleCheckInviteeEmail(inv.id)
                                }
                              }}
                              required
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={inv.checking || !inv.email.trim() || Boolean(inv.verifiedUser)}
                            onClick={() => handleCheckInviteeEmail(inv.id)}
                            className="h-9 px-3 text-xs shrink-0 font-semibold"
                          >
                            {inv.checking ? 'Cek...' : inv.verifiedUser ? '✅ Cocok' : '🔍 Cek'}
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={inv.percentage}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setNewGroupInvitees((prev) =>
                                  prev.map((r) => (r.id === inv.id ? { ...r, percentage: val } : r))
                                )
                              }}
                              className="w-16 h-9 text-center text-xs font-bold font-mono"
                            />
                            <span className="text-xs font-bold text-slate-500">%</span>
                          </div>
                          {Number(newGroupTarget) > 0 && (
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-24 text-right">
                              {formatRupiah(Math.round((Number(newGroupTarget) * Number(inv.percentage || 0)) / 100))}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Real-time Email Verification Status Preview Card */}
                      {inv.checking && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                          <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                          <span>Mengecek akun di SaveMe...</span>
                        </div>
                      )}

                      {inv.verifiedUser && (
                        <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {inv.verifiedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block truncate">
                                {inv.verifiedUser.name}
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 block truncate">
                                {inv.verifiedUser.email}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Terverifikasi
                          </span>
                        </div>
                      )}

                      {inv.error && (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{inv.error}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Button: Add More Friends */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddInviteeRow}
                  className="w-full border border-dashed border-slate-300 dark:border-[#2d3348] text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  + Tambah Teman Lain
                </Button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsCreateGroupOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={creatingGroup || totalAllocatedPercentage !== 100}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {creatingGroup ? 'Membuat...' : 'Buat Celengan Bersama'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ MODAL: UNDANG TEMAN KE GRUP (EXISTING GROUP) ════════════════════ */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Undang Teman Bergabung
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="flex flex-col gap-4">
              <FormField label="Email Teman (Terdaftar di SaveMe)" required>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      type="email"
                      placeholder="nama@gmail.com"
                      className="pl-9"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value)
                        setInviteVerifiedUser(null)
                        setInviteError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCheckSingleInviteEmail()
                        }
                      }}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={inviteChecking || !inviteEmail.trim() || Boolean(inviteVerifiedUser)}
                    onClick={handleCheckSingleInviteEmail}
                    className="shrink-0 text-xs font-semibold px-3"
                  >
                    {inviteChecking ? 'Cek...' : inviteVerifiedUser ? '✅ Cocok' : '🔍 Cek Akun'}
                  </Button>
                </div>
              </FormField>

              {/* Real-time verification preview card */}
              {inviteChecking && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <span>Mengecek akun di SaveMe...</span>
                </div>
              )}

              {inviteVerifiedUser && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {inviteVerifiedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                        {inviteVerifiedUser.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {inviteVerifiedUser.email}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Terverifikasi
                  </span>
                </div>
              )}

              <FormField label="Persentase Target (%)" required>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="20"
                  value={invitePercentage}
                  onChange={(e) => setInvitePercentage(e.target.value)}
                  required
                />
                {Number(invitePercentage) > 0 && inviteGroupTarget > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                    ≈ {formatRupiah(Math.round((inviteGroupTarget * Number(invitePercentage)) / 100))} dari total {formatRupiah(inviteGroupTarget)}
                  </span>
                )}
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={inviteLoading || !inviteVerifiedUser}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {inviteLoading ? 'Mengirim...' : 'Kirim Undangan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ MODAL: CREATE / EDIT INDIVIDUAL GOAL ════════════════════ */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {editingGoal ? 'Edit Celengan Impian' : 'Buat Celengan Impian Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {goalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {goalError}
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Ikon Emoji:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {emojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setSelectedEmoji(em)}
                      className={cn(
                        'w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer',
                        selectedEmoji === em
                          ? 'bg-green-500/20 border-2 border-green-500 shadow-sm scale-110'
                          : 'bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] hover:bg-slate-200'
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Nama Target Impian" required>
                <Input
                  placeholder="Contoh: Beli Laptop Baru, Liburan Bali"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  autoFocus
                  required
                />
              </FormField>

              <FormField label="Target Nominal (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 15000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Saldo Awal Disetor (Rp)">
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </FormField>

                <FormField label="Target Tanggal (Opsional)">
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Live Feasibility Check for Individual Goal */}
              {individualFeasibility && Number(targetAmount) > 0 && targetDate && (
                <div
                  className={cn(
                    'p-3.5 rounded-2xl border text-xs space-y-2',
                    !individualFeasibility.isFeasible && !individualFeasibility.isTight
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
                      : individualFeasibility.isTight
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  )}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {!individualFeasibility.isFeasible && !individualFeasibility.isTight ? (
                        <>⚠️ Peringatan Kapasitas Kas (Defisit {formatRupiah(individualFeasibility.deficitPerDay)}/hari)</>
                      ) : individualFeasibility.isTight ? (
                        <>⚡ Target Cukup Ketat</>
                      ) : (
                        <>🛡️ Target Aman & Realistis</>
                      )}
                    </span>
                    <span className="font-mono">
                      Wajib: {formatRupiah(individualFeasibility.dailyRequired)}/hari
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {individualFeasibility.advice}
                  </p>
                  {!individualFeasibility.isFeasible && !individualFeasibility.isTight && (
                    <button
                      type="button"
                      onClick={() => setTargetDate(individualFeasibility.suggestedSafeDate)}
                      className="w-full mt-1 py-1.5 px-3 rounded-xl bg-white dark:bg-[#1a1d27] border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Terapkan Deadline Aman ({new Date(individualFeasibility.suggestedSafeDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </button>
                  )}
                </div>
              )}

              {!editingGoal && Number(currentAmount) > 0 && spendingWallets.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sumber Dompet untuk Saldo Awal:
                  </label>
                  <select
                    value={goalWalletId}
                    onChange={(e) => setGoalWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-green-500"
                  >
                    {spendingWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Tersedia: {formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsGoalModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submittingGoal}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {editingGoal ? 'Simpan Perubahan' : 'Buat Celengan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ MODAL: SETOR UANG KE INDIVIDUAL GOAL ════════════════════ */}
      {depositModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl relative text-slate-900 dark:text-white overflow-hidden">
            {/* ── 1. Sticky Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2d3348] shrink-0 bg-white dark:bg-[#1a1d27]">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Setor ke: {depositModalGoal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDepositModalGoal(null)}
                aria-label="Tutup modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form wrapper with scrollable body + sticky footer */}
            <form onSubmit={handleDeposit} className="flex flex-col flex-1 min-h-0">
              {/* ── 2. Scrollable Body ── */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Progress bar saat ini */}
                {(() => {
                  const pct =
                    depositModalGoal.targetAmount > 0
                      ? Math.min(100, Math.round((depositModalGoal.currentAmount / depositModalGoal.targetAmount) * 100))
                      : 0
                  return (
                    <div className="pb-1">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="font-mono">{formatRupiah(depositModalGoal.currentAmount)}</span>
                        <span className="font-mono">Target {formatRupiah(depositModalGoal.targetAmount)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-[#2d3348] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{pct}% terkumpul</p>
                    </div>
                  )
                })()}

                {actionError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                    {actionError}
                  </div>
                )}

                {/* Wallet selector */}
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
                        {w.name} — Tersedia: {formatRupiah(w.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nominal setor */}
                <FormField label="Nominal Setor (Rp)" required>
                  <Input
                    type="number"
                    placeholder="Contoh: 100000"
                    value={amountAction}
                    onChange={(e) => setAmountAction(e.target.value)}
                    autoFocus
                    required
                  />
                </FormField>

                {/* ── Date picker: opsional, user pilih sendiri ─────────────────── */}
                {depositModalGoal.targetDate && (
                  <div className="space-y-2">
                    {/* Toggle card rapi & sejajar */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348]">
                      <div className="pr-3">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                          Atur kapan mulai nabung lagi?
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pilih tanggal jika ingin menunda setoran harian
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseCustomStartDate((v) => !v)}
                        aria-label="Toggle atur tanggal mulai nabung"
                        className={cn(
                          'w-10 h-5 rounded-full transition-colors duration-200 relative shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/20',
                          useCustomStartDate
                            ? 'bg-green-500'
                            : 'bg-slate-300 dark:bg-[#2d3348]'
                        )}
                      >
                        <span
                          className={cn(
                            'block w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 absolute top-0.5',
                            useCustomStartDate ? 'translate-x-5' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Date picker — full width sejajar dengan input lain tanpa pl-10 */}
                    {useCustomStartDate && (
                      <div className="space-y-1.5 pt-0.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Mulai Nabung Rutin Dari Tanggal:
                        </label>
                        <input
                          type="date"
                          value={depositStartDate}
                          min={new Date().toISOString().split('T')[0]}
                          max={depositModalGoal.targetDate}
                          onChange={(e) => setDepositStartDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-green-500"
                        />
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Target harian akan dibagi merata dari tanggal ini hingga batas akhir ({depositPreview?.targetDateFormatted || 'target'}).
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Live preview result ─────────────────────────────────────── */}
                {depositPreview && (
                  <div className="rounded-xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] divide-y divide-slate-100 dark:divide-[#2d3348] overflow-hidden">

                    {depositPreview.isGoalReached ? (
                      /* Target langsung tercapai */
                      <div className="flex items-center gap-3 px-4 py-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            Target langsung tercapai! 🎉
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Setelah setor ini, celengan {depositModalGoal.name} telah terkumpul 100%.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Progress baru setelah setor */}
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Total terkumpul</span>
                          <div className="text-right">
                            <span className="text-xs font-semibold font-mono text-slate-900 dark:text-white">
                              {formatRupiah(depositPreview.newCurrent)}
                            </span>
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ml-1.5">
                              ({depositPreview.newPct}%)
                            </span>
                          </div>
                        </div>

                        {/* Batas akhir target celengan */}
                        {depositPreview.hasTargetDate && (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Batas akhir target</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                              {depositPreview.targetDateFormatted}
                            </span>
                          </div>
                        )}

                        {/* Daily target baru */}
                        {depositPreview.hasTargetDate && (
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                                Target nabung harian
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {depositPreview.isStartAfterTarget || depositPreview.isStartInPast
                                  ? 'Jadwal perlu disesuaikan'
                                  : `Mulai ${new Date(depositPreview.effectiveStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} (${depositPreview.savingDays} hari nabung)`}
                              </span>
                            </div>
                            <div className="text-right">
                              {depositPreview.isStartAfterTarget ? (
                                <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                                  Lewat batas akhir
                                </span>
                              ) : depositPreview.isStartInPast ? (
                                <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                                  Tanggal terlewat
                                </span>
                              ) : depositPreview.newDailyTarget > 0 ? (
                                <span className={cn(
                                  'text-xs font-bold font-mono',
                                  depositPreview.isTight
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                )}>
                                  {formatRupiah(depositPreview.newDailyTarget)}/hari
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Warning / alert callout yang ramah & edukatif ──────────────── */}
                {depositPreview && !depositPreview.isGoalReached && depositPreview.hasTargetDate && (
                  depositPreview.isStartAfterTarget ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <span className="font-semibold block">Tanggal mulai melewati batas akhir</span>
                        <span>
                          Tanggal mulai nabung tidak boleh melewati batas akhir impian ({depositPreview.targetDateFormatted}). Silakan pilih tanggal yang lebih awal.
                        </span>
                      </div>
                    </div>
                  ) : depositPreview.isStartInPast ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <span className="font-semibold block">Tanggal sudah lewat</span>
                        <span>
                          Tanggal mulai nabung tidak boleh di masa lalu. Silakan pilih hari ini atau tanggal ke depan.
                        </span>
                      </div>
                    </div>
                  ) : depositPreview.isTight && !useCustomStartDate ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <span>
                        Target harianmu cukup besar ({formatRupiah(depositPreview.newDailyTarget)}/hari). Pertimbangkan menambah nominal setor atau mulai nabung lebih awal.
                      </span>
                    </div>
                  ) : depositPreview.isTight ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <span>
                        Sisa waktu nabung hanya {depositPreview.savingDays} hari, sehingga target per hari menjadi {formatRupiah(depositPreview.newDailyTarget)}/hari.
                      </span>
                    </div>
                  ) : null
                )}
              </div>

              {/* ── 3. Sticky Footer ── */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#2d3348] bg-slate-50/80 dark:bg-[#1e2230] shrink-0">
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
                  variant="primary"
                  size="md"
                  loading={actionLoading}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  disabled={Boolean(
                    actionLoading ||
                    depositPreview?.isStartAfterTarget ||
                    depositPreview?.isStartInPast ||
                    !amountAction ||
                    Number(amountAction) <= 0
                  )}
                >
                  Konfirmasi Setor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}




      {/* ════════════════════ MODAL: TARIK UANG DARI INDIVIDUAL GOAL ════════════════════ */}
      {withdrawModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl relative text-slate-900 dark:text-white overflow-hidden">
            {/* ── 1. Sticky Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2d3348] shrink-0 bg-white dark:bg-[#1a1d27]">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Tarik dari: {withdrawModalGoal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawModalGoal(null)}
                aria-label="Tutup modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form wrapper with scrollable body + sticky footer */}
            <form onSubmit={handleWithdraw} className="flex flex-col flex-1 min-h-0">
              {/* ── 2. Scrollable Body ── */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-gradient-to-r dark:from-purple-950/40 dark:via-[#1e2333] dark:to-[#1a1d27] border border-purple-200 dark:border-purple-500/30 text-xs text-slate-700 dark:text-slate-300 flex justify-between shadow-xs">
                  <span className="text-purple-700 dark:text-purple-300 font-medium">Saldo di Celengan Saat Ini:</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-200">
                    {formatRupiah(withdrawModalGoal.currentAmount)}
                  </span>
                </div>

                {actionError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                    {actionError}
                  </div>
                )}

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
              </div>

              {/* ── 3. Sticky Footer ── */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#2d3348] bg-slate-50/80 dark:bg-[#1e2230] shrink-0">
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

      {/* ════════════════════ MODAL: POP-UP DETAIL UNDANGAN (JIKA DIBUKA DARI DASHBOARD) ════════════════════ */}
      {activeInviteModal && (
        <GroupSavingsInviteModal
          invite={activeInviteModal.invite}
          group={activeInviteModal.group}
          userId={user?.uid || ''}
          onClose={() => setActiveInviteModal(null)}
          onResponded={() => {
            setActiveInviteModal(null)
            setRefreshTrigger((p) => p + 1)
          }}
        />
      )}

      {/* Delete Individual Goal Confirm */}
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

      {/* ── Milestone Toast ── */}
      {milestoneToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-emerald-300 dark:border-emerald-600/50 shadow-2xl shadow-emerald-500/20 min-w-[280px] max-w-sm">
            <span className="text-2xl shrink-0">{milestoneToast.emoji}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                {milestoneToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMilestoneToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
