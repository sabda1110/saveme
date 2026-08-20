'use client'

import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import { completeUserOnboarding, type OnboardingData } from '@/lib/auth/firebase-auth'
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
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface OnboardingWizardProps {
  userId: string
  userName?: string
  onComplete: () => void
}

export function OnboardingWizard({ userId, userName, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [initialBalance, setInitialBalance] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [savingsTarget, setSavingsTarget] = useState(20)
  const [loading, setLoading] = useState(false)

  const handleFinish = async (skip = false) => {
    setLoading(true)
    try {
      const data: OnboardingData = {
        initialBalance: skip ? 0 : Number(initialBalance) || 0,
        monthlyIncome: skip ? 0 : Number(monthlyIncome) || 0,
        savingsTarget: skip ? 20 : savingsTarget,
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

  const formatRupiahPreview = (val: string | number) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#1a1d27] border border-[#2d3348] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow ambient header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-green-500/15 rounded-full blur-[80px] pointer-events-none" />

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold flex items-center justify-center">
              {step}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Langkah {step} dari 3
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleFinish(true)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            Lewati Setup
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className={cn('h-1.5 rounded-full transition-all duration-300', step >= 1 ? 'bg-green-500' : 'bg-[#21263a]')} />
          <div className={cn('h-1.5 rounded-full transition-all duration-300', step >= 2 ? 'bg-green-500' : 'bg-[#21263a]')} />
          <div className={cn('h-1.5 rounded-full transition-all duration-300', step >= 3 ? 'bg-green-500' : 'bg-[#21263a]')} />
        </div>

        {/* STEP 1: Saldo Awal */}
        {step === 1 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center justify-center text-xl shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Halo, {userName || 'Teman SaveMe'}! Saldo Awalmu?
                </h3>
                <p className="text-xs text-slate-400">
                  Total uang tunai & saldo rekening yang siap kamu catat di SaveMe.
                </p>
              </div>
            </div>

            <FormField label="Saldo / Uang Kas Saat Ini (Rp)" hint="Boleh dikosongkan jika ingin mulai dari 0">
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
                  onClick={() => setInitialBalance(nominal === 0 ? '' : nominal.toString())}
                  className="px-3 py-1.5 rounded-xl bg-[#21263a] hover:bg-[#2d3348] border border-[#2d3348] text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  {nominal === 0 ? 'Mulai dari Rp 0' : formatRupiahPreview(nominal)}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                Saldo awal ini otomatis dicatat sebagai pemasukan perdana di dompetmu agar kalkulasi saldo tetap akurat.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2d3348]">
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
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Berapa Pemasukan Rutinmu?
                </h3>
                <p className="text-xs text-slate-400">
                  Estimasi gaji pokok atau omset bisnis per bulan.
                </p>
              </div>
            </div>

            <FormField label="Pemasukan Rata-Rata Bulanan (Rp)" hint="Digunakan untuk menghitung batas aman belanja harian">
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
              {[3000000, 5000000, 8000000, 15000000].map((nominal) => (
                <button
                  key={nominal}
                  type="button"
                  onClick={() => setMonthlyIncome(nominal.toString())}
                  className="px-3 py-1.5 rounded-xl bg-[#21263a] hover:bg-[#2d3348] border border-[#2d3348] text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  {formatRupiahPreview(nominal)}/bulan
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                SaveMe akan otomatis membagi pemasukanmu menjadi 30 hari untuk menampilkan <strong>Batas Belanja Harian</strong> agar kamu tidak boncos!
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#2d3348]">
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
                Lanjut ke Target
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Target Tabungan */}
        {step === 3 && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Target Menabung Bulanan
                </h3>
                <p className="text-xs text-slate-400">
                  Berapa persen pemasukan yang ingin kamu simpan/investasikan?
                </p>
              </div>
            </div>

            {/* Target Options */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { pct: 10, label: 'Santai', sub: '10% pemasukan' },
                { pct: 20, label: 'Ideal (50/30/20)', sub: '20% rekomendasi' },
                { pct: 30, label: 'Agresif', sub: '30% kebebasan' },
              ].map((opt) => (
                <button
                  key={opt.pct}
                  type="button"
                  onClick={() => setSavingsTarget(opt.pct)}
                  className={cn(
                    'p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                    savingsTarget === opt.pct
                      ? 'bg-green-500/20 border-green-500 text-white shadow-lg'
                      : 'bg-[#21263a] border-[#2d3348] text-slate-400 hover:border-slate-500'
                  )}
                >
                  <span className="text-lg font-bold font-mono text-green-400">
                    {opt.pct}%
                  </span>
                  <span className="text-xs font-bold text-slate-200">{opt.label}</span>
                  <span className="text-[10px] text-slate-400">{opt.sub}</span>
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#21263a] border border-[#2d3348] flex items-center justify-between">
              <span className="text-xs text-slate-300">Target Sisihan per Bulan:</span>
              <span className="text-sm font-bold font-mono text-green-400">
                {formatRupiahPreview(
                  ((Number(monthlyIncome) || 0) * savingsTarget) / 100
                )}
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#2d3348]">
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
