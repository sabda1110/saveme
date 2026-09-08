'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
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
import { Skeleton } from '@/components/atoms/Skeleton'
import {
  DollarSign,
  Calendar,
  Lock,
  Unlock,
  Target,
  CheckCircle2,
  RotateCcw,
  History,
  Briefcase,
  Zap,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  Sunrise,
  Moon,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import type {
  Wallet,
  SavingsGoal,
  IncomeType,
  PaydayScheduleType,
  SalaryAllocationRecord,
} from '@/types'
import { cn } from '@/lib/utils/cn'

type AllocationPreset = '50_30_20' | '60_30_10' | '100_0_0' | 'CUSTOM'

export default function PayrollPage() {
  const { user, userProfile, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [history, setHistory] = useState<SalaryAllocationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Current Month Data
  const now = new Date()
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`
  const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // Sifat / Mode Pemasukan: 'SALARIED' (Gaji Bulanan) atau 'FREELANCE_VARIABLE' (Pemasukan Fleksibel)
  const [incomeMode, setIncomeMode] = useState<IncomeType>(
    userProfile?.incomeType === 'FREELANCE_VARIABLE' || userProfile?.hasFixedSalary === false
      ? 'FREELANCE_VARIABLE'
      : 'SALARIED'
  )

  // Satu Input Nominal Utama (Single Source of Truth)
  const [amount, setAmount] = useState<string>(
    userProfile?.monthlyIncome && userProfile.monthlyIncome > 0
      ? userProfile.monthlyIncome.toString()
      : ''
  )
  const [primaryWalletId, setPrimaryWalletId] = useState<string>(
    userProfile?.primarySalaryWalletId || ''
  )
  const [lockedWalletId, setLockedWalletId] = useState<string>('')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')

  // Formula Pembagian
  const [preset, setPreset] = useState<AllocationPreset>('50_30_20')
  const [operatingPct, setOperatingPct] = useState<number>(50)
  const [lockedPct, setLockedPct] = useState<number>(20)
  const [goalsPct, setGoalsPct] = useState<number>(30)

  // Jadwal Gajian (Accordion untuk Mode Gaji Bulanan)
  const [showScheduleAccordion, setShowScheduleAccordion] = useState(false)
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
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Eksekusi & Reset State
  const [allocating, setAllocating] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [skipping, setSkipping] = useState(false)

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

          const defaultPrimaryId =
            userProfile?.primarySalaryWalletId || (firstUnlocked ? firstUnlocked.id : '')
          setPrimaryWalletId((prev) => prev || defaultPrimaryId)

          if (firstLocked) {
            setLockedWalletId((prev) => prev || firstLocked.id)
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

  // Cek Status Alokasi Bulan Ini (Hanya berlaku untuk SALARIED)
  const currentMonthAllocation = useMemo(() => {
    return history.find((h) => h.monthStr === currentMonthStr) || null
  }, [history, currentMonthStr])

  const isSalariedAllocatedThisMonth =
    incomeMode === 'SALARIED' &&
    (Boolean(currentMonthAllocation) || userProfile?.lastAllocatedMonth === currentMonthStr)

  // Handler Ganti Formula Preset
  const handleApplyPreset = (p: AllocationPreset) => {
    setPreset(p)
    if (p === '100_0_0') {
      setOperatingPct(100)
      setLockedPct(0)
      setGoalsPct(0)
    } else if (p === '50_30_20') {
      setOperatingPct(50)
      setLockedPct(20)
      setGoalsPct(30)
    } else if (p === '60_30_10') {
      setOperatingPct(60)
      setLockedPct(10)
      setGoalsPct(30)
    } else if (p === 'CUSTOM') {
      // Pastikan total pas 100 saat pertama kali pilih custom
      if (operatingPct + lockedPct + goalsPct !== 100) {
        setOperatingPct(50)
        setLockedPct(25)
        setGoalsPct(25)
      }
    }
  }

  // Handler Smart Auto-Balancing Slider "Atur Sendiri"
  // Saat tabungan disesuaikan, kas belanja otomatis menampung sisa sehingga total SELALU 100%
  const handleCustomLockedChange = (newLocked: number) => {
    const maxAllowedLocked = 100 - goalsPct
    const clampedLocked = Math.max(0, Math.min(newLocked, maxAllowedLocked))
    setLockedPct(clampedLocked)
    setOperatingPct(100 - clampedLocked - goalsPct)
  }

  const handleCustomGoalsChange = (newGoals: number) => {
    const maxAllowedGoals = 100 - lockedPct
    const clampedGoals = Math.max(0, Math.min(newGoals, maxAllowedGoals))
    setGoalsPct(clampedGoals)
    setOperatingPct(100 - lockedPct - clampedGoals)
  }

  const handleCustomOperatingChange = (newOperating: number) => {
    const clampedOp = Math.max(0, Math.min(newOperating, 100))
    setOperatingPct(clampedOp)
    const remaining = 100 - clampedOp
    if (lockedPct + goalsPct === 0) {
      setLockedPct(remaining)
    } else {
      const sumCurrent = lockedPct + goalsPct
      const newLocked = Math.round((lockedPct / sumCurrent) * remaining)
      setLockedPct(newLocked)
      setGoalsPct(remaining - newLocked)
    }
  }

  // Total Pct & Status Validasi
  const totalPct = operatingPct + lockedPct + goalsPct
  const isExact100 = totalPct === 100

  // Kalkulasi Real-Time
  const numAmount = Number(amount) || 0
  const calcOperatingAmount = Math.round((numAmount * operatingPct) / 100)
  const calcLockedAmount = Math.round((numAmount * lockedPct) / 100)
  const calcGoalsAmount = Math.round((numAmount * goalsPct) / 100)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Quick Chips Nominal
  const quickNominals = [
    { label: '+500rb', value: 500000 },
    { label: '+1 Juta', value: 1000000 },
    { label: '+3 Juta', value: 3000000 },
    { label: '+5 Juta', value: 5000000 },
    { label: '+10 Juta', value: 10000000 },
  ]

  // Handler Eksekusi Pembagian Uang Terpadu (1 Klik!)
  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return

    if (numAmount <= 0) {
      toast.error('Masukkan nominal uang yang valid terlebih dahulu!')
      return
    }

    if (!isExact100) {
      toast.error(`Total alokasi harus pas 100% (saat ini ${totalPct}%). Silakan sesuaikan slider!`)
      return
    }

    let targetWallet =
      wallets.find((w) => w.id === primaryWalletId) ||
      spendingWallets[0] ||
      wallets[0]

    const targetLockedWallet =
      wallets.find((w) => w.id === lockedWalletId) ||
      lockedWallets[0]

    const targetGoal =
      savingsGoals.find((g) => g.id === selectedGoalId) ||
      (savingsGoals.length > 0 ? savingsGoals[0] : undefined)

    setAllocating(true)
    try {
      // Auto-provision cash wallet jika akun belum punya kantong sama sekali
      if (!targetWallet) {
        targetWallet = await walletService.createWallet(user.uid, {
          name: 'Dompet Tunai (Kas)',
          type: 'CASH',
          balance: 0,
          icon: '💵',
          color: '#22c55e',
          isLocked: false,
        })
      }

      // 1. Simpan preferensi profil di latar belakang
      await updateUserProfile(user.uid, {
        incomeType: incomeMode,
        hasFixedSalary: incomeMode === 'SALARIED',
        monthlyIncome: incomeMode === 'SALARIED' ? numAmount : userProfile?.monthlyIncome || 0,
        primarySalaryWalletId: targetWallet.id,
        primarySalaryWalletName: targetWallet.name,
      })

      // 2. Eksekusi alokasi & pembagian dana
      const payload: SalaryAllocationInput = {
        incomeType: incomeMode,
        totalSalary: numAmount,
        primaryWalletId: targetWallet.id,
        primaryWalletName: targetWallet.name,
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

      const labelType = incomeMode === 'SALARIED' ? 'Gaji bulanan' : 'Pemasukan'
      toast.success(
        `🎉 ${labelType} sebesar ${formatRupiah(numAmount)} berhasil dibagi ke dompet kas & tabungan!`
      )

      // Jika mode fleksibel, kosongkan nominal untuk transaksi berikutnya
      if (incomeMode === 'FREELANCE_VARIABLE') {
        setAmount('')
      }

      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[payroll] Error executing allocation:', err)
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'Gagal membagikan uang. Silakan coba lagi.')
    } finally {
      setAllocating(false)
    }
  }

  // Handler Simpan Jadwal Gajian (Accordion)
  const handleSaveSchedule = async () => {
    if (!user?.uid) return
    const numPayday = Number(paydayDay)

    if (paydayScheduleType === 'CUSTOM' && (numPayday < 1 || numPayday > 31)) {
      toast.warning('Tanggal gajian harus antara 1 sampai 31')
      return
    }

    const calculatedPaydayDay =
      paydayScheduleType === 'START_OF_MONTH'
        ? 1
        : paydayScheduleType === 'END_OF_MONTH'
        ? lastDayOfCurrentMonth
        : numPayday || 25

    setSavingSchedule(true)
    try {
      await updateUserProfile(user.uid, {
        paydayScheduleType,
        paydayDay: calculatedPaydayDay,
        isEndOfMonthPayday: paydayScheduleType === 'END_OF_MONTH',
      })
      await refreshProfile()
      toast.success('Jadwal pengingat gajian berhasil disimpan!')
      setShowScheduleAccordion(false)
    } catch (err) {
      console.error('[payroll] Error saving schedule:', err)
      toast.error('Gagal menyimpan jadwal gajian')
    } finally {
      setSavingSchedule(false)
    }
  }

  // Handler Reset Alokasi
  const handleConfirmReset = async () => {
    if (!user?.uid) return
    setResetting(true)

    try {
      if (currentMonthAllocation) {
        await salaryAllocationService.resetAllocationForMonth(user.uid, currentMonthAllocation.id)
      } else {
        await salaryAllocationService.unlockUserPayroll(user.uid)
      }
      await refreshProfile()
      setResetModalOpen(false)
      toast.success('Alokasi bulan ini berhasil direset. Silakan bagi ulang bila perlu.')
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[payroll] Error resetting allocation:', err)
      toast.error('Gagal mereset alokasi')
    } finally {
      setResetting(false)
    }
  }

  // Handler Lewati Bulan Ini (Untuk Salaried yang sudah catat saldo manual)
  const handleSkipThisMonth = async () => {
    if (!user?.uid) return
    setSkipping(true)
    try {
      await updateUserProfile(user.uid, {
        lastAllocatedMonth: currentMonthStr,
      })
      await refreshProfile()
      toast.success(`Bulan ${monthName} ditandai selesai. Saldo aktif tetap digunakan.`)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[payroll] Error skipping month:', err)
      toast.error('Gagal memproses')
    } finally {
      setSkipping(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-12 max-w-4xl mx-auto">
      {/* 1. Header Halaman yang Ramah */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Alokasi &amp; Pembagian Uang Masuk
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bagi uang yang kamu terima secara cerdas ke kas belanja, tabungan darurat, dan celengan impian.
            </p>
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
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Toggle Tipe Pemasukan: Gajian Rutin vs Pemasukan Fleksibel */}
      <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-[#1a1d27] border border-slate-200 dark:border-white/8 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIncomeMode('SALARIED')}
          className={cn(
            'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
            incomeMode === 'SALARIED'
              ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Briefcase className="w-4 h-4" />
          <span>💼 Gajian Rutin Bulanan</span>
          <span className="hidden sm:inline text-[10px] opacity-75">(Karyawan / Pegawai)</span>
        </button>

        <button
          type="button"
          onClick={() => setIncomeMode('FREELANCE_VARIABLE')}
          className={cn(
            'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
            incomeMode === 'FREELANCE_VARIABLE'
              ? 'bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Zap className="w-4 h-4 text-emerald-500 dark:text-emerald-300" />
          <span>⚡ Pemasukan Bebas / Fleksibel</span>
          <span className="hidden sm:inline text-[10px] opacity-75">(Freelance, Mahasiswa, Proyek)</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && wallets.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          {/* 3. Status Banner Sesuai Mode */}
          {incomeMode === 'SALARIED' ? (
            <div
              className={cn(
                'p-5 sm:p-6 rounded-3xl border shadow-sm transition-all',
                isSalariedAllocatedThisMonth
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-500/30'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={cn(
                      'p-3 rounded-2xl shrink-0',
                      isSalariedAllocatedThisMonth
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                    )}
                  >
                    {isSalariedAllocatedThisMonth ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Calendar className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Periode {monthName}
                      </span>
                      {isSalariedAllocatedThisMonth ? (
                        <Badge variant="brand" size="xs">
                          ✅ Sudah Dialokasikan
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="xs">
                          Belum Dialokasikan
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isSalariedAllocatedThisMonth && currentMonthAllocation
                        ? `Gaji bulan ${monthName} sebesar ${formatRupiah(
                            currentMonthAllocation.totalSalary
                          )} telah berhasil dibagikan.`
                        : isSalariedAllocatedThisMonth
                        ? `Bulan ${monthName} sudah ditandai selesai. Saldo aktif tetap digunakan langsung.`
                        : `Gunakan formulir di bawah untuk membagikan gaji ${monthName} ke dompet belanja dan tabungan.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isSalariedAllocatedThisMonth ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetModalOpen(true)}
                      className="text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 text-xs cursor-pointer"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Koreksi / Reset
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSkipThisMonth}
                      loading={skipping}
                      className="text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-xs cursor-pointer"
                    >
                      Lewati Bulan Ini
                    </Button>
                  )}
                </div>
              </div>

              {/* Rangkuman jika Salaried sudah dialokasikan */}
              {isSalariedAllocatedThisMonth && currentMonthAllocation && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/8">
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#141824] border border-green-500/20">
                    <span className="text-[11px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" /> 1. Kas Belanja
                    </span>
                    <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                      {formatRupiah(currentMonthAllocation.operatingAmount)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#141824] border border-purple-500/20">
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> 2. Tabungan Beku
                    </span>
                    <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                      {formatRupiah(currentMonthAllocation.lockedAmount)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#141824] border border-blue-500/20">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> 3. Celengan Impian
                    </span>
                    <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                      {formatRupiah(currentMonthAllocation.goalsAmount)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Mode Fleksibel: Banner Santai & Bebas Beban
            <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mb-0.5">
                  🌿 Mode Alur Kas Santai &amp; Bebas (Zero-Pressure)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Kamu tidak terikat target gaji bulanan. Kapan pun ada uang proyek cair, kiriman uang saku,
                  atau rezeki baru, cukup masukkan nominal di bawah dan bagi langsung ke dompetmu!
                </p>
              </div>
            </div>
          )}

          {/* 4. FORMULIR TUNGGAL 3 LANGKAH (THE STREAMLINED CARD) */}
          {!isSalariedAllocatedThisMonth && (
            <form
              onSubmit={handleExecuteAllocation}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-sm space-y-6"
            >
              {/* LANGKAH 1: Berapa Uang yang Diterima? */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {incomeMode === 'SALARIED'
                      ? 'Berapa gaji yang kamu terima bulan ini?'
                      : 'Berapa uang yang baru kamu terima hari ini?'}
                  </h3>
                </div>

                {/* Single Nominal Input */}
                <FormField label="Nominal Uang Masuk (Rp)" required>
                  <Input
                    type="number"
                    placeholder="Contoh: 5000000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    leftIcon={<DollarSign className="w-4 h-4" />}
                    autoFocus
                    required
                  />
                </FormField>

                {/* Quick Chips Nominal */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Pintasan Cepat:</span>
                  {quickNominals.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setAmount(chip.value.toString())}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1a1d27] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/8 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="text-xs text-rose-500 hover:underline cursor-pointer ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <hr className="border-slate-100 dark:border-white/6" />

              {/* LANGKAH 2: Mau Dibagi Seperti Apa? */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Mau dibagi seperti apa? (Pilih Formula Simpel)
                    </h3>
                  </div>
                </div>

                {/* 4 Formula Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('100_0_0')}
                    className={cn(
                      'p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                      preset === '100_0_0'
                        ? 'bg-green-500/15 border-green-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-green-500/30'
                        : 'bg-slate-50 dark:bg-[#1a1d27] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <span className="text-base">🟢</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      100% Kas Belanja
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      Semua siap pakai untuk belanja harian
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('50_30_20')}
                    className={cn(
                      'p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                      preset === '50_30_20'
                        ? 'bg-purple-500/15 border-purple-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-purple-500/30'
                        : 'bg-slate-50 dark:bg-[#1a1d27] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <span className="text-base">🟣</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Ideal 50 / 30 / 20
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      Rekomendasi hemat &amp; tabungan aman
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('60_30_10')}
                    className={cn(
                      'p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                      preset === '60_30_10'
                        ? 'bg-blue-500/15 border-blue-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'bg-slate-50 dark:bg-[#1a1d27] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <span className="text-base">🟡</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Pelajar 60 / 30 / 10
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      Jajan lebih lega, tetap ada tabungan
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreset('CUSTOM')}
                    className={cn(
                      'p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                      preset === 'CUSTOM'
                        ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-slate-50 dark:bg-[#1a1d27] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <span className="text-base">⚙️</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Atur Sendiri
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      Kustom persentase sesuka hati
                    </span>
                  </button>
                </div>

                {/* Multi-Segment Visual Progress Bar (Total 100%) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-white/8 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span>Total Alokasi:</span>
                      <span
                        className={cn(
                          'font-mono font-bold px-2 py-0.5 rounded-lg text-xs',
                          isExact100
                            ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        )}
                      >
                        {totalPct}% ({formatRupiah(numAmount)})
                      </span>
                    </div>
                    <div className="text-[11px] font-medium">
                      {isExact100 ? (
                        <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 inline" /> Pas 100% Sesuai Gaji
                        </span>
                      ) : totalPct > 100 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 inline" /> Kelebihan {totalPct - 100}%
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 inline" /> Sisa {100 - totalPct}% belum terbagi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3-colored segment bar */}
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, operatingPct))}%` }}
                      className="bg-green-500 h-full transition-all duration-150"
                      title={`Kas Belanja: ${operatingPct}%`}
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, lockedPct))}%` }}
                      className="bg-purple-500 h-full transition-all duration-150"
                      title={`Tabungan Beku: ${lockedPct}%`}
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, goalsPct))}%` }}
                      className="bg-blue-500 h-full transition-all duration-150"
                      title={`Celengan Impian: ${goalsPct}%`}
                    />
                  </div>

                  {/* Legend & Breakdown Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      Belanja: <strong className="text-slate-800 dark:text-slate-200">{operatingPct}%</strong> ({formatRupiah(calcOperatingAmount)})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                      Tabungan Beku: <strong className="text-slate-800 dark:text-slate-200">{lockedPct}%</strong> ({formatRupiah(calcLockedAmount)})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      Celengan Impian: <strong className="text-slate-800 dark:text-slate-200">{goalsPct}%</strong> ({formatRupiah(calcGoalsAmount)})
                    </span>
                  </div>
                </div>

                {/* Hasil Pembagian Interaktif (Visual Breakdown Cards) */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Rincian Alokasi Dana:
                    </span>
                    {preset === 'CUSTOM' && (
                      <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                        💡 Geser slider tabungan, belanja otomatis menyesuaikan sisa
                      </span>
                    )}
                  </div>

                  {/* 1. Kas Belanja Harian */}
                  <div className="p-3.5 rounded-2xl bg-green-50/80 dark:bg-[#141824] border border-green-500/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Unlock className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          1. Kas Belanja Harian ({operatingPct}%)
                        </span>
                      </div>
                      <span className="text-sm font-black font-mono text-green-700 dark:text-green-400 shrink-0">
                        {formatRupiah(calcOperatingAmount)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Uang siap pakai untuk kebutuhan harian &amp; jatah belanja (*Safe-to-Spend*).
                    </span>

                    {/* Masuk ke rekening/dompet belanja (Responsif Mobile & Desktop) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pt-1">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 shrink-0">
                        Masuk ke dompet/rekening:
                      </span>
                      <select
                        value={primaryWalletId}
                        onChange={(e) => setPrimaryWalletId(e.target.value)}
                        className="w-full sm:w-auto sm:max-w-[280px] truncate px-3 py-1.5 sm:py-1 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-white/10 text-xs font-semibold text-green-700 dark:text-green-300 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer shadow-xs"
                      >
                        {spendingWallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.icon || '🏦'} {w.name} ({formatRupiah(w.balance)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {preset === 'CUSTOM' && (
                      <div className="space-y-1 mt-1 pt-1.5 border-t border-green-500/15">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            Atur porsi Kas Belanja:
                          </span>
                          <span className="font-mono font-bold text-green-600 dark:text-green-400">
                            {operatingPct}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={operatingPct}
                          onChange={(e) => handleCustomOperatingChange(Number(e.target.value))}
                          className="w-full accent-green-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Tabungan Darurat Beku */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-[#141824] border border-purple-500/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          2. Tabungan Darurat Beku ({lockedPct}%)
                        </span>
                      </div>
                      <span className="text-sm font-black font-mono text-purple-700 dark:text-purple-400 shrink-0">
                        {formatRupiah(calcLockedAmount)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Uang aman yang dikunci agar tidak terpakai belanja (*Pay Yourself First*).
                    </span>

                    {lockedWallets.length > 0 ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pt-1">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 shrink-0">
                          Simpan di kantong:
                        </span>
                        <select
                          value={lockedWalletId || lockedWallets[0]?.id || ''}
                          onChange={(e) => setLockedWalletId(e.target.value)}
                          className="w-full sm:w-auto sm:max-w-[280px] truncate px-3 py-1.5 sm:py-1 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-white/10 text-xs font-semibold text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-xs"
                        >
                          {lockedWallets.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.icon || '🔒'} {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-purple-500/10 text-[11px] text-purple-800 dark:text-purple-300">
                        💡 Belum punya Kantong Beku? SaveMe otomatis membuatkan kantong &quot;🔒 Tabungan Beku&quot; saat kamu klik bagi uang.
                      </div>
                    )}

                    {preset === 'CUSTOM' && (
                      <div className="space-y-1 mt-1 pt-1.5 border-t border-purple-500/15">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            Atur porsi Tabungan Beku:
                          </span>
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                            {lockedPct}% (Maks {100 - goalsPct}%)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100 - goalsPct}
                          value={lockedPct}
                          onChange={(e) => handleCustomLockedChange(Number(e.target.value))}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Celengan Impian */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-[#141824] border border-blue-500/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          3. Celengan Impian ({goalsPct}%)
                        </span>
                      </div>
                      <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-400 shrink-0">
                        {formatRupiah(calcGoalsAmount)}
                      </span>
                    </div>

                    {savingsGoals.length > 0 ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pt-1">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 shrink-0">
                          Setor ke celengan:
                        </span>
                        <select
                          value={selectedGoalId || savingsGoals[0]?.id || ''}
                          onChange={(e) => setSelectedGoalId(e.target.value)}
                          className="w-full sm:w-auto sm:max-w-[280px] truncate px-3 py-1.5 sm:py-1 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-white/10 text-xs font-semibold text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs"
                        >
                          {savingsGoals.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.icon || '🎯'} {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-blue-500/10 text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between gap-2">
                        <span>💡 Belum ada Celengan Impian. Porsi ini akan tetap tersimpan aman di rekening utama.</span>
                        <Link href="/savings" className="underline text-blue-600 dark:text-blue-400 font-bold shrink-0">
                          + Buat Celengan
                        </Link>
                      </div>
                    )}

                    {preset === 'CUSTOM' && (
                      <div className="space-y-1 mt-1 pt-1.5 border-t border-blue-500/15">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            Atur porsi Celengan Impian:
                          </span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {goalsPct}% (Maks {100 - lockedPct}%)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100 - lockedPct}
                          value={goalsPct}
                          onChange={(e) => handleCustomGoalsChange(Number(e.target.value))}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-white/6" />

              {/* LANGKAH 3: Tombol Aksi Utama (Satu Klik!) */}
              <div className="space-y-2">
                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  disabled={!isExact100 || numAmount <= 0}
                  loading={allocating}
                  className={cn(
                    'w-full font-extrabold text-sm sm:text-base py-3.5 text-white shadow-lg transition-all',
                    isExact100 && numAmount > 0
                      ? 'bg-purple-600 hover:bg-purple-500 cursor-pointer shadow-purple-500/25'
                      : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                  )}
                  rightIcon={<ChevronRight className="w-5 h-5" />}
                >
                  Bagi &amp; Masukkan ke Dompet Sekarang
                </Button>
                {!isExact100 && (
                  <p className="text-center text-xs text-rose-500 font-semibold">
                    ⚠️ Total persentase harus tepat 100% (saat ini {totalPct}%) sebelum uang dapat dibagikan.
                  </p>
                )}
                <p className="text-center text-[11px] text-slate-400">
                  Uang akan otomatis dicatat sebagai pemasukan dan didistribusikan ke dompet yang dipilih.
                </p>
              </div>
            </form>
          )}

          {/* 5. Accordion Jadwal Gajian Rutin (Opsional untuk Salaried) */}
          {incomeMode === 'SALARIED' && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-[#151822] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowScheduleAccordion(!showScheduleAccordion)}
                className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-white/2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Pengaturan Jadwal Pengingat Gajian Rutin (Opsional)
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Jadwal saat ini:{' '}
                      {paydayScheduleType === 'START_OF_MONTH'
                        ? 'Tanggal 1 (Awal Bulan)'
                        : paydayScheduleType === 'END_OF_MONTH'
                        ? 'Hari Terakhir Bulan'
                        : `Tanggal ${paydayDay}`}
                    </span>
                  </div>
                </div>
                {showScheduleAccordion ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showScheduleAccordion && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-white/6 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaydayScheduleType('START_OF_MONTH')}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                        paydayScheduleType === 'START_OF_MONTH'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#1a1d27] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <Sunrise className="w-4 h-4" />
                      <span className="text-xs font-bold">Awal Bulan</span>
                      <span className="text-[10px] opacity-75">Tgl 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaydayScheduleType('END_OF_MONTH')}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                        paydayScheduleType === 'END_OF_MONTH'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#1a1d27] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <Moon className="w-4 h-4" />
                      <span className="text-xs font-bold">Akhir Bulan</span>
                      <span className="text-[10px] opacity-75">Tgl 28–31</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaydayScheduleType('CUSTOM')}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                        paydayScheduleType === 'CUSTOM'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-[#1a1d27] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-bold">Kustom</span>
                      <span className="text-[10px] opacity-75">Pilih Tgl</span>
                    </button>
                  </div>

                  {paydayScheduleType === 'CUSTOM' && (
                    <div className="max-w-xs">
                      <FormField label="Tanggal Gajian Setiap Bulan (1 - 31)" required>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          placeholder="25"
                          value={paydayDay}
                          onChange={(e) => setPaydayDay(e.target.value)}
                        />
                      </FormField>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={savingSchedule}
                    onClick={handleSaveSchedule}
                    className="font-bold text-xs cursor-pointer"
                  >
                    Simpan Jadwal Gajian
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 6. Riwayat Pembagian Uang Masuk */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/6">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Riwayat Pembagian Uang
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {history.length} Catatan
              </span>
            </div>

            {history.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Info className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                <span>Belum ada riwayat pembagian uang yang tercatat.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#1a1d27] border border-slate-200/80 dark:border-white/6 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {record.monthName}
                        </span>
                        <Badge
                          variant={record.incomeType === 'SALARIED' ? 'brand' : 'neutral'}
                          size="xs"
                        >
                          {record.incomeType === 'SALARIED' ? 'Gaji Bulanan' : 'Fleksibel'}
                        </Badge>
                      </div>
                      <div className="text-base font-black font-mono text-purple-700 dark:text-purple-400">
                        {formatRupiah(record.totalSalary)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#141824] border border-slate-200/60 dark:border-white/6 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Kas Belanja:</span>
                        <span className="font-mono font-bold text-green-600 dark:text-green-400">
                          {formatRupiah(record.operatingAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Tabungan Beku:</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {formatRupiah(record.lockedAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Celengan:</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatRupiah(record.goalsAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      Waktu: {new Date(record.allocatedAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Konfirmasi Reset Alokasi */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title="Koreksi / Reset Alokasi Bulan Ini?"
        description="Mereset alokasi akan menghapus tanda selesai pada bulan ini sehingga Anda dapat membagikan ulang dana bila salah memasukkan angka."
        confirmText="Ya, Reset Alokasi"
        cancelText="Batal"
        variant="warning"
        loading={resetting}
        onConfirm={handleConfirmReset}
        onClose={() => setResetModalOpen(false)}
      />
    </div>
  )
}
