'use client'

import React, { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { salaryAllocationService } from '@/lib/services/salary-allocation.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import {
  Lock,
  Unlock,
  Sliders,
  DollarSign,
  X,
  Target,
  ArrowRight,
} from 'lucide-react'
import type { Wallet, SavingsGoal, RecurringBill } from '@/types'
import { cn } from '@/lib/utils/cn'

export interface PaydayAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  wallets: Wallet[]
  savingsGoals: SavingsGoal[]
  recurringBills?: RecurringBill[]
}

type AllocationPreset = '50_30_20' | '70_20_10' | 'CUSTOM'

export function PaydayAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  wallets,
  savingsGoals,
}: PaydayAllocationModalProps) {
  const { user, userProfile } = useAuth()

  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])

  const [totalSalary, setTotalSalary] = useState<string>(
    userProfile?.monthlyIncome ? userProfile.monthlyIncome.toString() : ''
  )
  const [payrollWalletId, setPayrollWalletId] = useState<string>(
    userProfile?.primarySalaryWalletId || spendingWallets[0]?.id || ''
  )
  const [lockedWalletId, setLockedWalletId] = useState<string>(
    lockedWallets[0]?.id || ''
  )
  const [preset, setPreset] = useState<AllocationPreset>('50_30_20')

  // Allocation Percentages or Amounts
  const [operatingPct, setOperatingPct] = useState<number>(50)
  const [lockedPct, setLockedPct] = useState<number>(20)
  const [goalsPct, setGoalsPct] = useState<number>(30)

  // Selected Goal for Top-up
  const [selectedGoalId, setSelectedGoalId] = useState<string>(
    savingsGoals[0]?.id || ''
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApplyPreset = (selectedPreset: AllocationPreset) => {
    setPreset(selectedPreset)
    if (selectedPreset === '50_30_20') {
      setOperatingPct(50)
      setLockedPct(20)
      setGoalsPct(30)
    } else if (selectedPreset === '70_20_10') {
      setOperatingPct(70)
      setLockedPct(20)
      setGoalsPct(10)
    }
  }

  const numSalary = Number(totalSalary) || 0
  const operatingAmount = Math.round((numSalary * operatingPct) / 100)
  const lockedAmount = Math.round((numSalary * lockedPct) / 100)
  const goalsAmount = Math.round((numSalary * goalsPct) / 100)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user?.uid) return
    if (numSalary <= 0) {
      setError('Nominal gaji harus lebih besar dari Rp 0')
      return
    }
    if (!payrollWalletId) {
      setError('Pilih rekening / dompet payroll penampung gaji')
      return
    }

    const payrollWallet = wallets.find((w) => w.id === payrollWalletId)
    const lockedWallet = wallets.find((w) => w.id === lockedWalletId)
    const selectedGoal = savingsGoals.find((g) => g.id === selectedGoalId)

    setSubmitting(true)
    try {
      await salaryAllocationService.executeAllocation(user.uid, {
        totalSalary: numSalary,
        primaryWalletId: payrollWalletId,
        primaryWalletName: payrollWallet?.name || 'Rekening Payroll',
        operatingCashAmount: operatingAmount,
        lockedSavingsAmount: lockedAmount > 0 && lockedWallet ? lockedAmount : 0,
        lockedWalletId: lockedWallet?.id,
        lockedWalletName: lockedWallet?.name,
        goalsAllocation:
          goalsAmount > 0 && selectedGoal
            ? [{ goalId: selectedGoal.id, goalName: selectedGoal.name, amount: goalsAmount }]
            : undefined,
      })

      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('[PaydayAllocationModal] Error:', err)
      const errObj = err as { message?: string }
      setError(errObj.message || 'Gagal mengeksekusi alokasi gaji')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-2xl p-6 sm:p-7 relative overflow-hidden max-h-[90vh] overflow-y-auto text-slate-900 dark:text-white">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-[#2d3348] relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Alokasi Gaji Cerdas (Payday Hub)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bagi gaji masuk ke kas belanja, tabungan beku, dan celengan impian
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#21263a]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleExecuteAllocation} className="flex flex-col gap-5 relative z-10">
          {/* 1. Input Total Gaji & Rekening Payroll */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/60 border border-slate-200 dark:border-[#2d3348]">
            <FormField label="Total Gaji Masuk (Rp)" required>
              <Input
                type="number"
                placeholder="Contoh: 10000000"
                value={totalSalary}
                onChange={(e) => setTotalSalary(e.target.value)}
                required
              />
            </FormField>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rekening Payroll Utama</label>
              <select
                value={payrollWalletId}
                onChange={(e) => setPayrollWalletId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                required
              >
                {spendingWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon || '🏦'} {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Preset Alokasi Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Pilih Rumus / Preset Alokasi Gaji:
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('50_30_20')}
                className={cn(
                  'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5',
                  preset === '50_30_20'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-lg shadow-purple-500/25 font-bold'
                    : 'bg-slate-100 dark:bg-gradient-to-br dark:from-[#21263a] dark:to-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <span className="text-xs font-bold">50 / 30 / 20</span>
                <span className="text-[10px] opacity-80">Ideal &amp; Seimbang</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('70_20_10')}
                className={cn(
                  'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5',
                  preset === '70_20_10'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-lg shadow-purple-500/25 font-bold'
                    : 'bg-slate-100 dark:bg-gradient-to-br dark:from-[#21263a] dark:to-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <span className="text-xs font-bold">70 / 20 / 10</span>
                <span className="text-[10px] opacity-80">Fokus Belanja</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('CUSTOM')}
                className={cn(
                  'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5',
                  preset === 'CUSTOM'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-lg shadow-purple-500/25 font-bold'
                    : 'bg-slate-100 dark:bg-gradient-to-br dark:from-[#21263a] dark:to-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <span className="text-xs font-bold">Kustom Split</span>
                <span className="text-[10px] opacity-80">Atur Sendiri</span>
              </button>
            </div>
          </div>

          {/* 3. Breakdown Pembagian 3 Pos Finansial */}
          <div className="space-y-3">
            {/* Pos 1: Kas Belanja Operasional */}
            <div className="p-3.5 rounded-2xl bg-green-50/80 dark:bg-gradient-to-br dark:from-emerald-950/40 dark:via-[#1e2333] dark:to-[#161922] border border-green-500/30 dark:border-emerald-500/40 shadow-sm dark:shadow-emerald-950/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-green-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-green-700 dark:text-emerald-300">
                    1. Kas Belanja Operasional ({operatingPct}%)
                  </span>
                </div>
                <span className="text-sm font-black font-mono text-green-700 dark:text-emerald-300">
                  {formatRupiah(operatingAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Uang untuk makan, transportasi, jajan, dan kebutuhan harian (dipakai dalam Jatah Belanja Harian).
              </p>
              {preset === 'CUSTOM' && (
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

            {/* Pos 2: Tabungan Beku / Dana Darurat */}
            <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-gradient-to-br dark:from-purple-950/40 dark:via-[#1e2333] dark:to-[#161922] border border-purple-500/30 dark:border-purple-500/40 shadow-sm dark:shadow-purple-950/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    2. Tabungan Beku &amp; Dana Darurat ({lockedPct}%)
                  </span>
                </div>
                <span className="text-sm font-black font-mono text-purple-700 dark:text-purple-200">
                  {formatRupiah(lockedAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Uang yang langsung dikunci &amp; diamankan agar tidak terpakai belanja (*Pay Yourself First*).
              </p>
              {lockedWallets.length > 0 && (
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Target Kantong Beku:</span>
                  <select
                    value={lockedWalletId}
                    onChange={(e) => setLockedWalletId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] text-xs text-purple-700 dark:text-purple-300 focus:outline-none cursor-pointer"
                  >
                    {lockedWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon || '🔒'} {w.name} ({formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {preset === 'CUSTOM' && (
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

            {/* Pos 3: Tabungan Impian (Savings Goals) */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-[#1e2333] dark:to-[#161922] border border-blue-500/30 dark:border-blue-500/40 shadow-sm dark:shadow-blue-950/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    3. Celengan Impian / Keinginan ({goalsPct}%)
                  </span>
                </div>
                <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-200">
                  {formatRupiah(goalsAmount)}
                </span>
              </div>
              {savingsGoals.length > 0 ? (
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Target Celengan:</span>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] text-xs text-blue-700 dark:text-blue-300 focus:outline-none cursor-pointer"
                  >
                    {savingsGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.icon || '🎯'} {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Belum ada target impian, sisa ini akan tetap di rekening utama untuk cadangan belanja/tagihan.
                </span>
              )}
              {preset === 'CUSTOM' && (
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

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#2d3348]">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="glow"
              size="md"
              loading={submitting}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Eksekusi Alokasi Gaji
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
