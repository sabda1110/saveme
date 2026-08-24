'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { updateUserProfile } from '@/lib/auth/firebase-auth'
import { walletService } from '@/lib/services/wallet.firebase'
import { savingsService } from '@/lib/services/savings.firebase'
import {
  salaryAllocationService,
  type SalaryAllocationInput,
} from '@/lib/services/salary-allocation.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import {
  DollarSign,
  Calendar,
  Lock,
  Unlock,
  Target,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  History,
  Briefcase,
  GraduationCap,
  Sparkles,
  Zap,
  ChevronRight,
  Info,
  RefreshCw,
  Sunrise,
  Moon,
} from 'lucide-react'
import type {
  Wallet,
  SavingsGoal,
  IncomeType,
  AllowanceFrequency,
  PaydayScheduleType,
  SalaryAllocationRecord,
} from '@/types'
import { cn } from '@/lib/utils/cn'

type AllocationPreset = '50_30_20' | '60_30_10' | '70_20_10' | '100_0_0' | 'CUSTOM'

export default function PayrollPage() {
  const { user, userProfile, refreshProfile } = useAuth()

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [history, setHistory] = useState<SalaryAllocationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Current Month String
  const now = new Date()
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`
  const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // Profile Settings Form State
  const [incomeType, setIncomeType] = useState<IncomeType>(userProfile?.incomeType || 'SALARIED')
  const [monthlyAmount, setMonthlyAmount] = useState<string>(
    userProfile?.monthlyIncome ? userProfile.monthlyIncome.toString() : ''
  )
  const [paydayScheduleType, setPaydayScheduleType] = useState<PaydayScheduleType>(
    userProfile?.paydayScheduleType ||
      (userProfile?.isEndOfMonthPayday
        ? 'END_OF_MONTH'
        : userProfile?.paydayDay === 1
        ? 'START_OF_MONTH'
        : 'CUSTOM')
  )
  const [paydayDay, setPaydayDay] = useState<string>(
    userProfile?.paydayDay ? userProfile.paydayDay.toString() : '25'
  )
  const [allowanceFreq, setAllowanceFreq] = useState<AllowanceFrequency>(
    userProfile?.allowanceFrequency || 'MONTHLY'
  )
  const [primaryWalletId, setPrimaryWalletId] = useState<string>(
    userProfile?.primarySalaryWalletId || ''
  )
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null)
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null)

  // Splitter / Allocation Form State
  const [allocAmount, setAllocAmount] = useState<string>(
    userProfile?.monthlyIncome ? userProfile.monthlyIncome.toString() : ''
  )
  const [allocPrimaryWalletId, setAllocPrimaryWalletId] = useState<string>('')
  const [allocLockedWalletId, setAllocLockedWalletId] = useState<string>('')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [preset, setPreset] = useState<AllocationPreset>('50_30_20')

  const [operatingPct, setOperatingPct] = useState<number>(50)
  const [lockedPct, setLockedPct] = useState<number>(20)
  const [goalsPct, setGoalsPct] = useState<number>(30)

  const [allocating, setAllocating] = useState(false)
  const [allocSuccessMsg, setAllocSuccessMsg] = useState<string | null>(null)
  const [allocErrorMsg, setAllocErrorMsg] = useState<string | null>(null)

  // Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Load Data
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [wList, gList, hist] = await Promise.all([
          walletService.getUserWallets(user.uid),
          savingsService.getUserGoals(user.uid),
          salaryAllocationService.getUserAllocationHistory(user.uid),
        ])

        if (isMounted) {
          setWallets(wList)
          setSavingsGoals(gList)
          setHistory(hist)

          const firstUnlocked = wList.find((w) => !w.isLocked) || wList[0]
          const firstLocked = wList.find((w) => w.isLocked)

          const defaultPrimaryId = userProfile?.primarySalaryWalletId || (firstUnlocked ? firstUnlocked.id : '')
          setAllocPrimaryWalletId((prev) => prev || defaultPrimaryId)
          setPrimaryWalletId((prev) => prev || defaultPrimaryId)

          if (firstLocked) {
            setAllocLockedWalletId((prev) => prev || firstLocked.id)
          }
          if (gList.length > 0) {
            setSelectedGoalId((prev) => prev || gList[0].id)
          }
        }
      } catch (err) {
        console.error('[payroll] Error loading data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [user?.uid, refreshTrigger, userProfile?.primarySalaryWalletId])

  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])

  // Current Month Allocation Check
  const currentMonthAllocation = useMemo(() => {
    return history.find((h) => h.monthStr === currentMonthStr) || null
  }, [history, currentMonthStr])

  const isAlreadyAllocatedThisMonth =
    Boolean(currentMonthAllocation) || userProfile?.lastAllocatedMonth === currentMonthStr

  // Preset switch handler
  const handleApplyPreset = (p: AllocationPreset) => {
    setPreset(p)
    if (p === '50_30_20') {
      setOperatingPct(50)
      setLockedPct(20)
      setGoalsPct(30)
    } else if (p === '60_30_10') {
      setOperatingPct(60)
      setLockedPct(10)
      setGoalsPct(30)
    } else if (p === '70_20_10') {
      setOperatingPct(70)
      setLockedPct(20)
      setGoalsPct(10)
    } else if (p === '100_0_0') {
      setOperatingPct(100)
      setLockedPct(0)
      setGoalsPct(0)
    }
  }

  const numAllocAmount = Number(allocAmount) || 0
  const calcOperatingAmount = Math.round((numAllocAmount * operatingPct) / 100)
  const calcLockedAmount = Math.round((numAllocAmount * lockedPct) / 100)
  const calcGoalsAmount = Math.round((numAllocAmount * goalsPct) / 100)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Effective Payday Day
  const effectivePaydayDay = useMemo(() => {
    if (paydayScheduleType === 'START_OF_MONTH') return 1
    if (paydayScheduleType === 'END_OF_MONTH') return lastDayOfCurrentMonth
    return Number(paydayDay) || 25
  }, [paydayScheduleType, lastDayOfCurrentMonth, paydayDay])

  // Save Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSuccessMsg(null)
    setSettingsErrorMsg(null)

    if (!user?.uid) return

    const numAmount = Number(monthlyAmount)
    const numPayday = Number(paydayDay)

    if (
      incomeType === 'SALARIED' &&
      paydayScheduleType === 'CUSTOM' &&
      (numPayday < 1 || numPayday > 31)
    ) {
      setSettingsErrorMsg('Tanggal gajian harus antara 1 sampai 31')
      return
    }

    const calculatedPaydayDay =
      paydayScheduleType === 'START_OF_MONTH'
        ? 1
        : paydayScheduleType === 'END_OF_MONTH'
        ? lastDayOfCurrentMonth
        : numPayday || 25

    const selectedWallet =
      wallets.find((w) => w.id === primaryWalletId) ||
      spendingWallets[0] ||
      wallets[0]

    setSavingSettings(true)
    try {
      await updateUserProfile(user.uid, {
        incomeType,
        hasFixedSalary: incomeType !== 'FREELANCE_VARIABLE',
        monthlyIncome: numAmount || 0,
        allowanceAmount: incomeType === 'STUDENT_ALLOWANCE' ? numAmount || 0 : 0,
        allowanceFrequency: incomeType === 'STUDENT_ALLOWANCE' ? allowanceFreq : 'MONTHLY',
        paydayScheduleType,
        paydayDay: calculatedPaydayDay,
        isEndOfMonthPayday: paydayScheduleType === 'END_OF_MONTH',
        primarySalaryWalletId: selectedWallet?.id || undefined,
        primarySalaryWalletName: selectedWallet?.name || undefined,
      })

      await refreshProfile()
      setSettingsSuccessMsg('Pengaturan siklus & mode finansial berhasil diperbarui!')
      setTimeout(() => setSettingsSuccessMsg(null), 3500)
    } catch (err: unknown) {
      console.error('[payroll] Error updating settings:', err)
      const errObj = err as { message?: string }
      setSettingsErrorMsg(errObj.message || 'Gagal menyimpan pengaturan')
    } finally {
      setSavingSettings(false)
    }
  }

  // Execute Allocation Handler
  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setAllocErrorMsg(null)
    setAllocSuccessMsg(null)

    if (!user?.uid) return

    if (isAlreadyAllocatedThisMonth) {
      setAllocErrorMsg(
        `Alokasi untuk periode ${monthName} sudah dilakukan sebelumnya. Anda hanya dapat mengalokasikan 1 kali per bulan agar saldo tidak dobel.`
      )
      return
    }

    if (numAllocAmount <= 0) {
      setAllocErrorMsg('Nominal pemasukan harus lebih besar dari Rp 0')
      return
    }

    let targetPayrollWallet =
      wallets.find((w) => w.id === allocPrimaryWalletId) ||
      wallets.find((w) => w.id === userProfile?.primarySalaryWalletId) ||
      spendingWallets[0] ||
      wallets[0]

    const targetLockedWallet =
      wallets.find((w) => w.id === allocLockedWalletId) ||
      lockedWallets[0]

    const targetGoal =
      savingsGoals.find((g) => g.id === selectedGoalId) ||
      (savingsGoals.length > 0 ? savingsGoals[0] : undefined)

    setAllocating(true)
    try {
      if (!targetPayrollWallet) {
        // Auto-provision default cash wallet on-the-fly if user has 0 wallets
        targetPayrollWallet = await walletService.createWallet(user.uid, {
          name: 'Dompet Tunai (Kas)',
          type: 'CASH',
          balance: 0,
          icon: '💵',
          color: '#22c55e',
          isLocked: false,
        })
      }

      const payload: SalaryAllocationInput = {
        incomeType,
        totalSalary: numAllocAmount,
        primaryWalletId: targetPayrollWallet.id,
        primaryWalletName: targetPayrollWallet.name,
        operatingCashAmount: calcOperatingAmount,
        lockedSavingsAmount: calcLockedAmount > 0 ? calcLockedAmount : 0,
        lockedWalletId: targetLockedWallet?.id,
        lockedWalletName: targetLockedWallet?.name,
        goalsAllocation:
          calcGoalsAmount > 0 && targetGoal
            ? [{ goalId: targetGoal.id, goalName: targetGoal.name, amount: calcGoalsAmount }]
            : undefined,
      }

      await salaryAllocationService.executeAllocation(user.uid, payload)
      await refreshProfile()
      setAllocSuccessMsg(`🎉 Alokasi ${incomeType === 'STUDENT_ALLOWANCE' ? 'uang saku' : 'gaji'} periode ${monthName} berhasil dicatat & didistribusikan!`)
      setRefreshTrigger((p) => p + 1)
      setTimeout(() => setAllocSuccessMsg(null), 4000)
    } catch (err: unknown) {
      console.error('[payroll] Error allocating salary:', err)
      const errObj = err as { message?: string }
      setAllocErrorMsg(errObj.message || 'Gagal mengeksekusi alokasi')
    } finally {
      setAllocating(false)
    }
  }

  // Reset Allocation Handler
  const handleConfirmReset = async () => {
    if (!user?.uid) return
    setResetting(true)

    try {
      if (currentMonthAllocation) {
        await salaryAllocationService.resetAllocationForMonth(
          user.uid,
          currentMonthAllocation.id
        )
      } else {
        await salaryAllocationService.unlockUserPayroll(user.uid)
      }
      await refreshProfile()
      setResetModalOpen(false)
      setAllocSuccessMsg('Alokasi bulan ini berhasil direset. Silakan lakukan alokasi ulang.')
      setRefreshTrigger((p) => p + 1)
      setTimeout(() => setAllocSuccessMsg(null), 3500)
    } catch (err) {
      console.error('[payroll] Error resetting allocation:', err)
    } finally {
      setResetting(false)
    }
  }

  // Skip This Month Handler — untuk user baru yang saldo sudah dicatat manual
  const [skipping, setSkipping] = useState(false)

  const handleSkipThisMonth = async () => {
    if (!user?.uid) return
    setSkipping(true)
    try {
      await updateUserProfile(user.uid, {
        lastAllocatedMonth: currentMonthStr,
      })
      await refreshProfile()
      setAllocSuccessMsg(`✅ Bulan ${monthName} ditandai selesai. Saldo yang sudah kamu catat tetap digunakan — alokasi otomatis berlaku mulai bulan depan.`)
      setRefreshTrigger((p) => p + 1)
      setTimeout(() => setAllocSuccessMsg(null), 5000)
    } catch (err) {
      console.error('[payroll] Error skipping month:', err)
    } finally {
      setSkipping(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-10 max-w-6xl mx-auto">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Alokasi Pemasukan &amp; Payroll
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Pusat distribusi gaji, uang saku pelajar, dan pemisahan kas belanja vs tabungan beku
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            className="text-xs cursor-pointer"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs">
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Success / Error Banners */}
      {settingsSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-green-500/40 text-xs sm:text-sm text-green-300 flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <span>{settingsSuccessMsg}</span>
        </div>
      )}

      {allocSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-green-500/40 text-xs sm:text-sm text-green-300 flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <span>{allocSuccessMsg}</span>
        </div>
      )}

      {allocErrorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-xs sm:text-sm text-red-300 flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{allocErrorMsg}</span>
        </div>
      )}

      {/* 🛡️ 1. Monthly Allocation Status & Cycle Banner */}
      <div
        className={cn(
          'p-5 sm:p-7 rounded-3xl border shadow-md dark:shadow-2xl relative overflow-hidden transition-all',
          isAlreadyAllocatedThisMonth
            ? 'bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/70 dark:via-[#1a1d27] dark:to-[#1a1d27] border-green-500/40'
            : 'bg-gradient-to-br from-purple-50 via-white to-white dark:from-purple-950/50 dark:via-[#1a1d27] dark:to-[#1a1d27] border-purple-500/30'
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={cn(
                'p-3.5 rounded-2xl border shrink-0',
                isAlreadyAllocatedThisMonth
                  ? 'bg-green-500/20 border-green-500/40 text-green-600 dark:text-green-400'
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-600 dark:text-purple-300 animate-pulse'
              )}
            >
              {isAlreadyAllocatedThisMonth ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <Calendar className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Status Alokasi Periode {monthName}
                </span>
                {isAlreadyAllocatedThisMonth ? (
                  <Badge variant="brand" size="sm">
                    ✅ Sudah Dialokasikan (Terkunci 1x/Bulan)
                  </Badge>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-500/30">
                    ⚠️ Belum Dialokasikan
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {isAlreadyAllocatedThisMonth && currentMonthAllocation
                  ? `Pemasukan bulan ${monthName} sebesar ${formatRupiah(currentMonthAllocation.totalSalary)} telah didistribusikan ke Kas Belanja (${formatRupiah(currentMonthAllocation.operatingAmount)}), Tabungan Beku (${formatRupiah(currentMonthAllocation.lockedAmount)}), dan Celengan Impian.`
                  : isAlreadyAllocatedThisMonth
                  ? `Bulan ${monthName} sudah ditandai selesai. Saldo aktif kamu digunakan langsung.`
                  : `Siklus pemasukan ${incomeType === 'STUDENT_ALLOWANCE' ? 'uang saku' : 'gaji'} dijadwalkan setiap ${paydayScheduleType === 'END_OF_MONTH' ? 'Hari Terakhir Bulan' : paydayScheduleType === 'START_OF_MONTH' ? 'Tanggal 1 (Awal Bulan)' : `Tanggal ${effectivePaydayDay}`}. Gunakan tombol di bawah untuk mendistribusikan dana secara terencana.`}
              </p>

              {!isAlreadyAllocatedThisMonth && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  💡 <strong>Baru bergabung bulan ini?</strong> Jika kamu sudah menerima gaji dan saldo sudah dicatat manual lewat Saldo Awal, klik <strong>&quot;Lewati Bulan Ini&quot;</strong> agar notifikasi ini tidak muncul lagi.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:self-center shrink-0">
            {isAlreadyAllocatedThisMonth ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setResetModalOpen(true)}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 text-xs cursor-pointer"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Koreksi / Reset Alokasi
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkipThisMonth}
                loading={skipping}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500/10 border border-slate-300 dark:border-slate-500/30 text-xs cursor-pointer"
                leftIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Lewati Bulan Ini
              </Button>
            )}
          </div>
        </div>

        {/* Breakdown Card if Already Allocated */}
        {isAlreadyAllocatedThisMonth && currentMonthAllocation && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-[#2d3348]/70">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#131620]/80 border border-green-500/30 flex flex-col shadow-sm">
              <span className="text-[11px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5" /> 1. Kas Belanja Harian
              </span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatRupiah(currentMonthAllocation.operatingAmount)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Masuk ke {currentMonthAllocation.primaryWalletName}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#131620]/80 border border-purple-500/30 flex flex-col shadow-sm">
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> 2. Tabungan Beku (*Safe*)
              </span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatRupiah(currentMonthAllocation.lockedAmount)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Terkunci di {currentMonthAllocation.lockedWalletName || 'Kantong Beku'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#131620]/80 border border-blue-500/30 flex flex-col shadow-sm">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> 3. Celengan Impian
              </span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatRupiah(currentMonthAllocation.goalsAmount)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Disetor ke target impian aktif
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ⚙️ 2. Konfigurasi Profil Finansial & Siklus (Col-span-5) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl flex flex-col justify-between text-slate-900 dark:text-white">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Mode Finansial &amp; Siklus</h3>
              </div>
              <Badge variant="brand" size="sm">
                {incomeType === 'SALARIED'
                  ? 'Karyawan'
                  : incomeType === 'STUDENT_ALLOWANCE'
                  ? 'Pelajar / Uang Saku'
                  : 'Freelance Bebas'}
              </Badge>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              {/* Income Type Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Profil Pengguna:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIncomeType('SALARIED')
                      handleApplyPreset('50_30_20')
                    }}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                      incomeType === 'SALARIED'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Karyawan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIncomeType('STUDENT_ALLOWANCE')
                      handleApplyPreset('60_30_10')
                    }}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                      incomeType === 'STUDENT_ALLOWANCE'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Pelajar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIncomeType('FREELANCE_VARIABLE')
                      handleApplyPreset('50_30_20')
                    }}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                      incomeType === 'FREELANCE_VARIABLE'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Freelance</span>
                  </button>
                </div>
              </div>

              {/* Nominal Amount Input */}
              <FormField
                label={
                  incomeType === 'STUDENT_ALLOWANCE'
                    ? 'Nominal Uang Saku / Uang Jajan (Rp)'
                    : 'Gaji Pokok / Pemasukan Bulanan (Rp)'
                }
                hint={
                  incomeType === 'STUDENT_ALLOWANCE'
                    ? 'Total uang saku yang biasa kamu terima dari orang tua.'
                    : 'Nominal gaji bulanan tempat SaveMe menghitung jatah belanja.'
                }
              >
                <Input
                  type="number"
                  placeholder="Contoh: 5000000"
                  value={monthlyAmount}
                  onChange={(e) => {
                    setMonthlyAmount(e.target.value)
                    setAllocAmount(e.target.value)
                  }}
                  leftIcon={<DollarSign className="w-4 h-4" />}
                />
              </FormField>

              {/* Salaried Specific Payday Cycle */}
              {incomeType === 'SALARIED' && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Jadwal Siklus Gajian:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaydayScheduleType('START_OF_MONTH')}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                        paydayScheduleType === 'START_OF_MONTH'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                          : 'bg-white dark:bg-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <Sunrise className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span className="text-[11px] font-bold">Awal Bulan</span>
                      <span className="text-[9px] opacity-75">Tgl 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaydayScheduleType('END_OF_MONTH')}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                        paydayScheduleType === 'END_OF_MONTH'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                          : 'bg-white dark:bg-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <span className="text-[11px] font-bold">Akhir Bulan</span>
                      <span className="text-[9px] opacity-75">Tgl 28-31</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaydayScheduleType('CUSTOM')}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                        paydayScheduleType === 'CUSTOM'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                          : 'bg-white dark:bg-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] font-bold">Kustom</span>
                      <span className="text-[9px] opacity-75">Input Tgl</span>
                    </button>
                  </div>

                  {paydayScheduleType === 'CUSTOM' && (
                    <FormField label="Tanggal Gajian Setiap Bulan (1 - 31)" required>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="25"
                        value={paydayDay}
                        onChange={(e) => setPaydayDay(e.target.value)}
                        leftIcon={<Calendar className="w-4 h-4" />}
                      />
                    </FormField>
                  )}

                  {paydayScheduleType === 'START_OF_MONTH' && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                      🌅 Gaji masuk otomatis setiap tanggal 1 di awal bulan.
                    </div>
                  )}

                  {paydayScheduleType === 'END_OF_MONTH' && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-800 dark:text-indigo-300">
                      🌙 Gaji masuk otomatis di hari terakhir bulan berjalan (tgl 28/29 Feb, 30, atau 31).
                    </div>
                  )}
                </div>
              )}

              {/* Student Specific Allowance Frequency */}
              {incomeType === 'STUDENT_ALLOWANCE' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Frekuensi Penerimaan Uang Saku
                  </label>
                  <select
                    value={allowanceFreq}
                    onChange={(e) => setAllowanceFreq(e.target.value as AllowanceFrequency)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="MONTHLY">Bulanan (Setiap Awal Bulan)</option>
                    <option value="WEEKLY">Mingguan (Setiap Hari Senin)</option>
                    <option value="DAILY">Harian (Setiap Hari)</option>
                  </select>
                </div>
              )}

              {/* Primary Payroll Wallet */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {incomeType === 'STUDENT_ALLOWANCE'
                    ? 'Dompet / Rekening Penampung Uang Saku'
                    : 'Rekening Payroll / Dompet Gaji Utama'}
                </label>
                <select
                  value={primaryWalletId}
                  onChange={(e) => setPrimaryWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="">Pilih dompet penampung...</option>
                  {spendingWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon || '🏦'} {w.name} ({formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {settingsErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                  {settingsErrorMsg}
                </div>
              )}

              <Button
                type="submit"
                variant="secondary"
                size="md"
                loading={savingSettings}
                className="w-full font-bold mt-2"
              >
                Simpan Pengaturan Siklus
              </Button>
            </form>
          </div>
        </div>

        {/* 💰 3. Simulator & Eksekutor Alokasi Cerdas 1x/Bulan (Col-span-7) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl flex flex-col justify-between text-slate-900 dark:text-white">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Simulator &amp; Eksekutor Alokasi Dana
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Periode {monthName}</span>
            </div>

            <form onSubmit={handleExecuteAllocation} className="flex flex-col gap-4">
              {/* Input Nominal Alokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label={`Total ${incomeType === 'STUDENT_ALLOWANCE' ? 'Uang Saku' : 'Gaji'} Masuk (Rp)`}
                  required
                >
                  <Input
                    type="number"
                    placeholder="Contoh: 10000000"
                    value={allocAmount}
                    onChange={(e) => setAllocAmount(e.target.value)}
                    disabled={isAlreadyAllocatedThisMonth}
                    required
                  />
                </FormField>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rekening Tujuan Masuk</label>
                  <select
                    value={allocPrimaryWalletId}
                    onChange={(e) => setAllocPrimaryWalletId(e.target.value)}
                    disabled={isAlreadyAllocatedThisMonth}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    {spendingWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon || '🏦'} {w.name} ({formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preset Switcher */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Pilih Formula Alokasi:
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('100_0_0')}
                    disabled={isAlreadyAllocatedThisMonth}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50',
                      preset === '100_0_0'
                        ? 'bg-green-600 border-green-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <span className="text-xs font-bold">100% Kas</span>
                    <span className="text-[10px] opacity-80">Semua ke Belanja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('50_30_20')}
                    disabled={isAlreadyAllocatedThisMonth}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50',
                      preset === '50_30_20'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <span className="text-xs font-bold">50 / 30 / 20</span>
                    <span className="text-[10px] opacity-80">Ideal Karyawan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('60_30_10')}
                    disabled={isAlreadyAllocatedThisMonth}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50',
                      preset === '60_30_10'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <span className="text-xs font-bold">60 / 30 / 10</span>
                    <span className="text-[10px] opacity-80">Pelajar &amp; Jajan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreset('CUSTOM')}
                    disabled={isAlreadyAllocatedThisMonth}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50',
                      preset === 'CUSTOM'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <span className="text-xs font-bold">Kustom Split</span>
                    <span className="text-[10px] opacity-80">Atur Sendiri</span>
                  </button>
                </div>
              </div>

              {/* 3 Allocation Output Cards */}
              <div className="space-y-3">
                {wallets.length === 0 && !isAlreadyAllocatedThisMonth && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed text-[11px]">
                      <span className="font-bold">Belum ada kantong/rekening aktif:</span> Saat Anda menekan tombol eksekusi, SaveMe akan <strong>otomatis membuatkan &quot;Dompet Tunai (Kas)&quot;</strong> sebagai penampung alokasi gaji ini.
                    </div>
                  </div>
                )}

                {/* 1. Kas Belanja */}
                <div className="p-3.5 rounded-2xl bg-green-50/70 dark:bg-[#21263a]/70 border border-green-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <Unlock className="w-4 h-4" /> 1. Kas Belanja / Uang Jajan ({operatingPct}%)
                    </span>
                    <span className="text-sm font-black font-mono text-green-700 dark:text-green-400">
                      {formatRupiah(calcOperatingAmount)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Masuk ke kas operasional untuk jatah harian (*Safe-to-Spend*).
                  </span>
                  {preset === 'CUSTOM' && !isAlreadyAllocatedThisMonth && (
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={operatingPct}
                      onChange={(e) => setOperatingPct(Number(e.target.value))}
                      className="w-full accent-green-500 cursor-pointer"
                    />
                  )}
                </div>

                {/* 2. Tabungan Beku */}
                <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-[#21263a]/70 border border-purple-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                      <Lock className="w-4 h-4" /> 2. Tabungan Beku &amp; Darurat ({lockedPct}%)
                    </span>
                    <span className="text-sm font-black font-mono text-purple-700 dark:text-purple-400">
                      {formatRupiah(calcLockedAmount)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Uang aman yang dikunci agar tidak terpotong saat belanja (*Pay Yourself First*).
                  </span>
                  {lockedWallets.length > 0 && !isAlreadyAllocatedThisMonth ? (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Target Kantong Beku:</span>
                      <select
                        value={allocLockedWalletId || lockedWallets[0]?.id || ''}
                        onChange={(e) => setAllocLockedWalletId(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] text-xs text-purple-700 dark:text-purple-300 focus:outline-none"
                      >
                        {lockedWallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.icon || '🔒'} {w.name} ({formatRupiah(w.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : !isAlreadyAllocatedThisMonth ? (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-800 dark:text-purple-300 flex items-center justify-between gap-2 mt-1">
                      <span>
                        💡 Belum punya Kantong Beku? Tenang, sistem akan <strong>otomatis membuatkan kantong &quot;🔒 Tabungan Beku &amp; Darurat&quot;</strong> saat kamu mengeksekusi alokasi ini.
                      </span>
                    </div>
                  ) : null}
                  {preset === 'CUSTOM' && !isAlreadyAllocatedThisMonth && (
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={lockedPct}
                      onChange={(e) => setLockedPct(Number(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  )}
                </div>

                {/* 3. Celengan Impian */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-[#21263a]/70 border border-blue-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Target className="w-4 h-4" /> 3. Celengan Impian / Keinginan ({goalsPct}%)
                    </span>
                    <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-400">
                      {formatRupiah(calcGoalsAmount)}
                    </span>
                  </div>
                  {savingsGoals.length > 0 && !isAlreadyAllocatedThisMonth ? (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Target Celengan:</span>
                      <select
                        value={selectedGoalId || savingsGoals[0]?.id || ''}
                        onChange={(e) => setSelectedGoalId(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] text-xs text-blue-700 dark:text-blue-300 focus:outline-none"
                      >
                        {savingsGoals.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.icon || '🎯'} {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : !isAlreadyAllocatedThisMonth ? (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between gap-2 mt-1">
                      <span>
                        💡 Belum ada Celengan Impian. Porsi ini akan tetap tersimpan aman di rekening utama sebagai cadangan belanja.
                      </span>
                      <Link href="/savings" className="underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 font-bold">
                        + Buat Celengan
                      </Link>
                    </div>
                  ) : null}
                  {preset === 'CUSTOM' && !isAlreadyAllocatedThisMonth && (
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={goalsPct}
                      onChange={(e) => setGoalsPct(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  loading={allocating}
                  disabled={isAlreadyAllocatedThisMonth}
                  className={cn(
                    'w-full font-bold cursor-pointer',
                    isAlreadyAllocatedThisMonth
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  )}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  {isAlreadyAllocatedThisMonth
                    ? `✅ Alokasi ${monthName} Selesai (Terkunci 1x/Bulan)`
                    : `Eksekusi Alokasi ${incomeType === 'STUDENT_ALLOWANCE' ? 'Uang Saku' : 'Gaji'} Bulan Ini`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 📜 4. Riwayat Alokasi Gaji Bulanan (History Table/Cards) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Riwayat Alokasi Bulanan
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{history.length} Catatan Periode</span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center gap-2">
            <Info className="w-6 h-6 text-slate-400" />
            <span>Belum ada riwayat alokasi pemasukan yang tercatat.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/60 border border-slate-200 dark:border-[#2d3348] flex flex-col justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{record.monthName}</span>
                    <Badge variant="brand" size="sm">
                      {record.incomeType === 'STUDENT_ALLOWANCE' ? 'Uang Saku' : 'Gaji'}
                    </Badge>
                  </div>
                  <div className="text-lg font-black font-mono text-purple-700 dark:text-purple-300">
                    {formatRupiah(record.totalSalary)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348]/70 text-[11px] space-y-1 shadow-sm">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span>Kas Belanja:</span>
                    <span className="font-mono text-green-700 dark:text-green-400 font-bold">
                      {formatRupiah(record.operatingAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span>Tabungan Beku:</span>
                    <span className="font-mono text-purple-700 dark:text-purple-400 font-bold">
                      {formatRupiah(record.lockedAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span>Celengan:</span>
                    <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">
                      {formatRupiah(record.goalsAmount)}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono">
                  Dialokasikan: {new Date(record.allocatedAt).toLocaleDateString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Reset Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title="Reset Alokasi Bulan Ini?"
        description="Mereset alokasi akan menghapus status alokasi periode ini agar Anda dapat membagikan ulang dana. Pastikan saldo transaksi sebelumnya disesuaikan bila perlu."
        confirmText="Ya, Reset Alokasi"
        variant="warning"
        loading={resetting}
        onConfirm={handleConfirmReset}
        onClose={() => setResetModalOpen(false)}
      />
    </div>
  )
}
