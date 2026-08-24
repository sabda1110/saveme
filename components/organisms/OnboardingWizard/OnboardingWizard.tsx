'use client'

import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import { completeUserOnboarding, type OnboardingData } from '@/lib/auth/firebase-auth'
import { recurringService } from '@/lib/services/recurring.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import {
  Wallet,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  X,
  CreditCard,
  Check,
  Receipt,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface OnboardingWizardProps {
  userId: string
  userName?: string
  initialData?: {
    initialBalance?: number
    monthlyIncome?: number
    savingsTarget?: number
  }
  onComplete: () => void
  onClose?: () => void
}

interface InstallmentItem {
  id: string
  name: string
  amount: string
}

export function OnboardingWizard({
  userId,
  userName,
  initialData,
  onComplete,
  onClose,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [initialBalance, setInitialBalance] = useState(
    initialData?.initialBalance ? initialData.initialBalance.toString() : ''
  )
  const [monthlyIncome, setMonthlyIncome] = useState(
    initialData?.monthlyIncome ? initialData.monthlyIncome.toString() : ''
  )

  // Step 3: Multi-Cicilan Bulanan
  const [hasInstallment, setHasInstallment] = useState<boolean>(false)
  const [installments, setInstallments] = useState<InstallmentItem[]>([
    { id: '1', name: 'Cicilan Motor / HP / KPR', amount: '' },
  ])

  // Step 4: Target Tabungan (Zero-Math Rupiah)
  const [savingsTarget, setSavingsTarget] = useState(initialData?.savingsTarget || 20)
  const [customSavingsAmount, setCustomSavingsAmount] = useState('')
  const [isCustomSavings, setIsCustomSavings] = useState(false)

  const [loading, setLoading] = useState(false)

  const numIncome = Number(monthlyIncome) || 0
  const totalInstallments = hasInstallment
    ? installments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : 0
  const validInstallmentCount = hasInstallment
    ? installments.filter((item) => (Number(item.amount) || 0) > 0).length
    : 0
  const effectiveBaseIncome = Math.max(0, numIncome - totalInstallments)

  const handleAddInstallment = () => {
    setInstallments((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', amount: '' },
    ])
  }

  const handleRemoveInstallment = (id: string) => {
    setInstallments((prev) => {
      const updated = prev.filter((item) => item.id !== id)
      return updated.length > 0 ? updated : [{ id: '1', name: '', amount: '' }]
    })
  }

  const handleUpdateInstallment = (
    id: string,
    field: 'name' | 'amount',
    value: string
  ) => {
    setInstallments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // Opsi Tabungan Otomatis dalam Rupiah Nyata
  const savingsOptions = [
    {
      pct: 10,
      label: 'Santai',
      sub: 'Yang penting rutin ada simpanan',
      amount: Math.round(effectiveBaseIncome * 0.1),
    },
    {
      pct: 20,
      label: 'Pas (Rekomendasi)',
      sub: 'Aman untuk jaga-jaga & masa depan',
      amount: Math.round(effectiveBaseIncome * 0.2),
      isRecommended: true,
    },
    {
      pct: 30,
      label: 'Banyak (Semangat)',
      sub: 'Biar cepat kebeli barang impian',
      amount: Math.round(effectiveBaseIncome * 0.3),
    },
  ]

  const chosenSavingsAmount = isCustomSavings
    ? Number(customSavingsAmount) || 0
    : Math.round((effectiveBaseIncome * savingsTarget) / 100)

  const operatingMonthlyBudget = Math.max(
    0,
    numIncome - totalInstallments - chosenSavingsAmount
  )
  const estimatedDailyBudget = Math.round(operatingMonthlyBudget / 30)

  const formatRupiahPreview = (val: string | number) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num)
  }

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const handleFinish = async (skip = false) => {
    setLoading(true)
    try {
      // 1. Jika ada cicilan, buat masing-masing data di Firestore recurring_bills
      if (!skip && hasInstallment && totalInstallments > 0) {
        for (const inst of installments) {
          const amount = Number(inst.amount) || 0
          if (amount > 0) {
            try {
              await recurringService.create(userId, {
                name: inst.name.trim() || 'Cicilan Pokok Bulanan',
                amount,
                categoryId: 'cat-4',
                categoryName: 'Bills',
                categoryIcon: '📄',
                dueDay: 25,
                autoDeduct: false,
                billType: 'INSTALLMENT',
                notes: 'Didaftarkan saat onboarding awal SaveMe',
              })
            } catch (err) {
              console.error('[onboarding] Error creating recurring bill:', err)
            }
          }
        }
      }

      // 2. Simpan profil user & budget bulanan langsung aktif
      const computedSavingsPct =
        isCustomSavings && effectiveBaseIncome > 0
          ? Math.round((chosenSavingsAmount / effectiveBaseIncome) * 100)
          : savingsTarget

      const data: OnboardingData = {
        initialBalance: skip
          ? initialData?.initialBalance || 0
          : Number(initialBalance) || 0,
        monthlyIncome: skip ? initialData?.monthlyIncome || 0 : numIncome,
        savingsTarget: skip ? initialData?.savingsTarget || 20 : computedSavingsPct,
        monthlyBudget: skip ? undefined : operatingMonthlyBudget,
        monthlyBudgetMonth: skip ? undefined : currentMonthStr,
      }

      await completeUserOnboarding(userId, data)

      // Fire festive confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#3b82f6', '#f59e0b'],
      })

      onComplete()
    } catch (error) {
      console.error('[onboarding] Error completing setup:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-900 dark:text-white">
        {/* Glow ambient header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-green-500/15 rounded-full blur-[80px] pointer-events-none" />

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center">
              {step}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Langkah {step} dari 4
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFinish(true)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                Lewati Setup
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-8">
          <div
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              step >= 1 ? 'bg-green-500' : 'bg-slate-200 dark:bg-[#21263a]'
            )}
          />
          <div
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              step >= 2 ? 'bg-green-500' : 'bg-slate-200 dark:bg-[#21263a]'
            )}
          />
          <div
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              step >= 3 ? 'bg-green-500' : 'bg-slate-200 dark:bg-[#21263a]'
            )}
          />
          <div
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              step >= 4 ? 'bg-green-500' : 'bg-slate-200 dark:bg-[#21263a]'
            )}
          />
        </div>

        {/* STEP 1: Saldo Awal */}
        {step === 1 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 flex items-center justify-center text-xl shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Halo, {userName || 'Teman SaveMe'}! Saldo Awalmu?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Total uang tunai & saldo rekening yang siap kamu kelola di SaveMe.
                </p>
              </div>
            </div>

            <FormField
              label="Saldo / Uang Kas Saat Ini (Rp)"
              hint="Boleh dikosongkan jika ingin mulai dari Rp 0"
            >
              <Input
                type="number"
                placeholder="Contoh: 1500000"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                autoFocus
              />
            </FormField>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2">
              {[0, 500000, 1000000, 2500000, 5000000].map((nominal) => (
                <button
                  key={nominal}
                  type="button"
                  onClick={() =>
                    setInitialBalance(nominal === 0 ? '' : nominal.toString())
                  }
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#21263a] hover:bg-slate-200 dark:hover:bg-[#2d3348] border border-slate-200 dark:border-[#2d3348] text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {nominal === 0 ? 'Mulai dari Rp 0' : formatRupiahPreview(nominal)}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                Saldo awal ini otomatis dicatat sebagai pemasukan perdana di dompetmu agar kalkulasi saldo tetap akurat.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2d3348]">
              <Button
                variant="glow"
                size="md"
                onClick={() => setStep(2)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Lanjut ke Pemasukan
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Pemasukan Bulanan */}
        {step === 2 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Berapa Pemasukan Rutinmu?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Estimasi gaji bulanan, uang saku, atau omset usaha per bulan.
                </p>
              </div>
            </div>

            <FormField
              label="Pemasukan Rata-Rata Bulanan (Rp)"
              hint="Digunakan sebagai dasar jatah belanja harianmu"
            >
              <Input
                type="number"
                placeholder="Contoh: 5000000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                autoFocus
              />
            </FormField>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2">
              {[2000000, 3500000, 5000000, 8000000, 15000000].map((nominal) => (
                <button
                  key={nominal}
                  type="button"
                  onClick={() => setMonthlyIncome(nominal.toString())}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#21263a] hover:bg-slate-200 dark:hover:bg-[#2d3348] border border-slate-200 dark:border-[#2d3348] text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {formatRupiahPreview(nominal)}/bulan
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                SaveMe akan membagi pemasukan ini menjadi jatah belanja harian agar kamu tidak boncos sebelum akhir bulan!
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#2d3348]">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Kembali
              </Button>
              <Button
                variant="glow"
                size="md"
                onClick={() => setStep(3)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Lanjut ke Cicilan
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Multi-Cicilan Bulanan (Opsional & Bisa Banyak) */}
        {step === 3 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Punya Cicilan Bulanan?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Seperti cicilan motor, HP, KPR, atau pinjaman lainnya (bisa lebih dari satu).
                </p>
              </div>
            </div>

            {/* Toggle Choices */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHasInstallment(false)}
                className={cn(
                  'p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                  !hasInstallment
                    ? 'bg-green-500/20 border-green-500 text-slate-900 dark:text-white shadow-md'
                    : 'bg-slate-50 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                )}
              >
                <span className="text-xl">🎉</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Bebas Cicilan</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tidak ada cicilan bulanan yang wajib dibayar
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHasInstallment(true)}
                className={cn(
                  'p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                  hasInstallment
                    ? 'bg-purple-500/20 border-purple-500 text-slate-900 dark:text-white shadow-md'
                    : 'bg-slate-50 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                )}
              >
                <span className="text-xl">🛵</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Ada Cicilan</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ada 1 atau lebih cicilan yang harus dipotong
                </span>
              </button>
            </div>

            {/* If has installments, show dynamic multi-item list */}
            {hasInstallment && (
              <div className="flex flex-col gap-3.5 animate-in fade-in max-h-[280px] overflow-y-auto pr-1">
                {installments.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex flex-col gap-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                        Cicilan #{index + 1}
                      </span>
                      {installments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInstallment(item.id)}
                          className="p-1 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"
                          title="Hapus Cicilan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                          Nama Cicilan
                        </label>
                        <Input
                          placeholder="Misal: Cicilan Motor"
                          value={item.name}
                          onChange={(e) =>
                            handleUpdateInstallment(item.id, 'name', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                          Nominal per Bulan (Rp)
                        </label>
                        <Input
                          type="number"
                          placeholder="Contoh: 850000"
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateInstallment(item.id, 'amount', e.target.value)
                          }
                          autoFocus={index === installments.length - 1}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Another Installment Button */}
                <button
                  type="button"
                  onClick={handleAddInstallment}
                  className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Cicilan Lain
                </button>

                {/* Live Total Installments Calculation */}
                {totalInstallments > 0 && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Total {validInstallmentCount} Cicilan:</span>
                      <p className="font-bold font-mono text-red-600 dark:text-red-400">
                        - {formatRupiahPreview(totalInstallments)}/bln
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Sisa Gaji Bersih:</span>
                      <p className="font-bold font-mono text-emerald-600 dark:text-emerald-300">
                        {formatRupiahPreview(effectiveBaseIncome)}/bln
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  Semua cicilan ini langsung otomatis tersinkron ke menu Cicilan & Tagihan (/bills).
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#2d3348]">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStep(2)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Kembali
              </Button>
              <Button
                variant="glow"
                size="md"
                onClick={() => setStep(4)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Lanjut ke Tabungan
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Target Tabungan (Zero-Math Rupiah) */}
        {step === 4 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Mau Disisihkan Berapa Buat Tabungan?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {totalInstallments > 0
                    ? `Dihitung dari sisa uang bersihmu (${formatRupiahPreview(effectiveBaseIncome)} / bulan).`
                    : 'Pilih nominal uang yang nyaman kamu tabung setiap bulan.'}
                </p>
              </div>
            </div>

            {/* Rupiah Target Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {savingsOptions.map((opt) => (
                <button
                  key={opt.pct}
                  type="button"
                  onClick={() => {
                    setSavingsTarget(opt.pct)
                    setIsCustomSavings(false)
                  }}
                  className={cn(
                    'p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                    !isCustomSavings && savingsTarget === opt.pct
                      ? 'bg-emerald-500/15 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:via-[#1e2333] dark:to-[#161922] border-emerald-500 text-slate-900 dark:text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-50 dark:bg-gradient-to-br dark:from-[#21263a] dark:to-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:border-emerald-500/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatRupiahPreview(opt.amount)}
                    </span>
                    {!isCustomSavings && savingsTarget === opt.pct && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{opt.sub}</span>
                </button>
              ))}
            </div>

            {/* Custom Nominal Option */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomSavings(true)}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer',
                  isCustomSavings
                    ? 'bg-emerald-500/20 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                ✍️ Ketik Nominal Sendiri
              </button>
              {isCustomSavings && (
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    placeholder="Nominal tabungan per bulan"
                    value={customSavingsAmount}
                    onChange={(e) => setCustomSavingsAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Outcome Summary Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gradient-to-br dark:from-[#1e2333] dark:to-[#131620] border border-slate-200 dark:border-[#2d3348] space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                Hasil Perhitungan Uangmu:
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-[#2d3348] text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">💼 Pemasukan Bulanan:</span>
                  <span className="font-semibold font-mono text-slate-900 dark:text-white">
                    {formatRupiahPreview(numIncome)}
                  </span>
                </div>
                {totalInstallments > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>🛵 Total Cicilan ({validInstallmentCount} item):</span>
                    <span className="font-mono font-semibold">
                      - {formatRupiahPreview(totalInstallments)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>🏦 Uang Ditabung:</span>
                  <span className="font-mono font-semibold">
                    - {formatRupiahPreview(chosenSavingsAmount)}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-[#2d3348] pt-1.5 flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">🛍️ Budget Belanja Bulanan:</span>
                  <span className="font-extrabold font-mono text-slate-900 dark:text-white">
                    {formatRupiahPreview(operatingMonthlyBudget)}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-gradient-to-r dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-500/20 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <span className="text-[11px] font-medium">📅 Jatah Belanja Harian:</span>
                <span className="font-extrabold font-mono text-emerald-700 dark:text-emerald-300 text-sm">
                  {formatRupiahPreview(estimatedDailyBudget)} / hari
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#2d3348]">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStep(3)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Kembali
              </Button>
              <Button
                variant="glow"
                size="lg"
                loading={loading}
                onClick={() => handleFinish(false)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Selesai & Buka Dashboard! 🚀
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

