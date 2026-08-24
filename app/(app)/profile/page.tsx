'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { updateUserProfile } from '@/lib/auth/firebase-auth'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  Sliders,
  DollarSign,
  Target,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Briefcase,
  GraduationCap,
  Zap,
  Sunrise,
  Moon,
  Sun,
} from 'lucide-react'
import type { Wallet, IncomeType, PaydayScheduleType } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function ProfilePage() {
  const { user, userProfile, sessionInfo, refreshProfile, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const [wallets, setWallets] = useState<Wallet[]>([])

  // Form State initialized from userProfile
  const [name, setName] = useState(userProfile?.name || '')
  const [incomeType, setIncomeType] = useState<IncomeType>(userProfile?.incomeType || 'SALARIED')
  const [monthlyIncome, setMonthlyIncome] = useState(
    userProfile?.monthlyIncome ? userProfile.monthlyIncome.toString() : ''
  )
  const [savingsTarget, setSavingsTarget] = useState(
    userProfile?.savingsTarget ? userProfile.savingsTarget.toString() : '20'
  )
  const [paydayScheduleType, setPaydayScheduleType] = useState<PaydayScheduleType>(
    userProfile?.paydayScheduleType ||
      (userProfile?.isEndOfMonthPayday
        ? 'END_OF_MONTH'
        : userProfile?.paydayDay === 1
        ? 'START_OF_MONTH'
        : 'CUSTOM')
  )
  const [paydayDay, setPaydayDay] = useState(
    userProfile?.paydayDay ? userProfile.paydayDay.toString() : '25'
  )
  const [primarySalaryWalletId, setPrimarySalaryWalletId] = useState(
    userProfile?.primarySalaryWalletId || ''
  )
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadWallets() {
      if (!user?.uid) return
      try {
        const wList = await walletService.getUserWallets(user.uid)
        setWallets(wList)
      } catch (err) {
        console.error('[profile] Error loading wallets:', err)
      }
    }
    loadWallets()
  }, [user?.uid])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    if (!user?.uid) return
    if (!name.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong')
      return
    }

    const numPayday = Number(paydayDay)
    if (
      incomeType === 'SALARIED' &&
      paydayScheduleType === 'CUSTOM' &&
      (numPayday < 1 || numPayday > 31)
    ) {
      setErrorMessage('Tanggal gajian harus antara tanggal 1 sampai 31')
      return
    }

    const calculatedPaydayDay =
      paydayScheduleType === 'START_OF_MONTH'
        ? 1
        : paydayScheduleType === 'END_OF_MONTH'
        ? 31
        : numPayday || 25

    const selectedWallet = wallets.find((w) => w.id === primarySalaryWalletId)

    setSaving(true)
    try {
      await updateUserProfile(user.uid, {
        name: name.trim(),
        incomeType,
        hasFixedSalary: incomeType !== 'FREELANCE_VARIABLE',
        monthlyIncome: Number(monthlyIncome) || 0,
        savingsTarget: Number(savingsTarget) || 20,
        paydayScheduleType,
        paydayDay: calculatedPaydayDay,
        isEndOfMonthPayday: paydayScheduleType === 'END_OF_MONTH',
        primarySalaryWalletId: primarySalaryWalletId || undefined,
        primarySalaryWalletName: selectedWallet?.name || undefined,
      })

      await refreshProfile()
      setSuccessMessage('Pengaturan profil & mode finansial berhasil disimpan!')
    } catch (err: unknown) {
      console.error('[profile] Error updating profile:', err)
      const errObj = err as { message?: string }
      setErrorMessage(errObj.message || 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const incomeNum = Number(monthlyIncome) || 0
  const targetPct = Number(savingsTarget) || 20
  const monthlySavingsEst = (incomeNum * targetPct) / 100
  const dailySafeEst = Math.round((incomeNum * (1 - targetPct / 100)) / 30)

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400">
            <User className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Profil & Pengaturan Finansial
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola data akun, tema tampilan, mode pengguna, dan target menabungmu
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-xs sm:text-sm text-green-700 dark:text-green-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 border border-green-400/40 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-xl">
            {userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {userProfile?.name || 'Pengguna SaveMe'}
              </h2>
              <Badge variant="brand" size="sm">
                {incomeType === 'SALARIED'
                  ? 'Karyawan'
                  : incomeType === 'STUDENT_ALLOWANCE'
                  ? 'Pelajar / Uang Saku'
                  : 'Freelance Bebas'}
              </Badge>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1 font-mono">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </span>

            {/* Session Security Indicator */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sesi Aktif: Sisa {sessionInfo?.daysLeft ?? 7} hari
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                (Batas Keamanan 7 Hari)
              </span>
            </div>

            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-mono">
              UID: {user?.uid}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 text-xs w-full sm:w-auto"
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Keluar dari Akun
        </Button>
      </div>

      {/* Theme Selection Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#2d3348]">
          <Sun className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Tema Tampilan (Light &amp; Dark Mode)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn(
              'p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
              theme === 'light'
                ? 'bg-green-500/10 border-green-500 shadow-md ring-2 ring-green-500/20'
                : 'bg-slate-50 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  ☀️ Mode Terang (Light Mode)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Nuansa putih bersih, segar &amp; elegan
                </span>
              </div>
            </div>
            {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
              theme === 'dark'
                ? 'bg-green-500/10 border-green-500 shadow-md ring-2 ring-green-500/20'
                : 'bg-slate-50 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  🌙 Mode Gelap (Dark Mode)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Nuansa navy luxury &amp; nyaman di malam hari
                </span>
              </div>
            </div>
            {theme === 'dark' && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 sm:gap-6">
        {/* Section 1: Informasi Dasar */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#2d3348]">
            <User className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Informasi Dasar</h3>
          </div>

          <FormField label="Nama Lengkap" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              leftIcon={<User className="w-4 h-4" />}
              required
            />
          </FormField>

          <FormField label="Alamat Email (Terkunci)">
            <Input
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </FormField>
        </div>

        {/* Section 2: Mode Finansial & Target */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl flex flex-col gap-4 sm:gap-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#2d3348]">
            <Sliders className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Mode Finansial &amp; Target Keuangan
            </h3>
          </div>

          {/* 3-Mode Financial Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Mode Pengguna:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIncomeType('SALARIED')}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  incomeType === 'SALARIED'
                    ? 'bg-purple-600/20 border-purple-500 text-slate-900 dark:text-white shadow-md'
                    : 'bg-slate-50 dark:bg-[#21263a]/60 border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Karyawan</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Gaji tetap &amp; tanggal gajian</span>
              </button>

              <button
                type="button"
                onClick={() => setIncomeType('STUDENT_ALLOWANCE')}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  incomeType === 'STUDENT_ALLOWANCE'
                    ? 'bg-purple-600/20 border-purple-500 text-slate-900 dark:text-white shadow-md'
                    : 'bg-slate-50 dark:bg-[#21263a]/60 border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Pelajar / Mahasiswa</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Uang saku &amp; jatah jajan</span>
              </button>

              <button
                type="button"
                onClick={() => setIncomeType('FREELANCE_VARIABLE')}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  incomeType === 'FREELANCE_VARIABLE'
                    ? 'bg-purple-600/20 border-purple-500 text-slate-900 dark:text-white shadow-md'
                    : 'bg-slate-50 dark:bg-[#21263a]/60 border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Freelancer / Bebas</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Tanpa jadwal gajian tetap</span>
              </button>
            </div>
          </div>

          <FormField
            label={
              incomeType === 'STUDENT_ALLOWANCE'
                ? 'Nominal Uang Saku / Uang Jajan Bulanan (Rp)'
                : 'Estimasi Pemasukan Pokok / Gaji Bulanan (Rp)'
            }
            hint="Angka ini digunakan SaveMe untuk menghitung batas aman belanja harianmu."
          >
            <Input
              type="number"
              placeholder="Contoh: 5000000"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
          </FormField>

          {/* Payday Schedule Selector for Salaried */}
          {incomeType === 'SALARIED' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] space-y-3">
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
                <FormField
                  label="Tanggal Gajian Setiap Bulan (1 - 31)"
                  hint="Tanggal masuknya gaji (contoh: 25, 1, 28) untuk menghitung siklus gajian."
                  required
                >
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

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {incomeType === 'STUDENT_ALLOWANCE'
                ? 'Dompet / Rekening Penampung Uang Saku Utama'
                : 'Rekening Payroll / Dompet Gaji Utama'}
            </label>
            <select
              value={primarySalaryWalletId}
              onChange={(e) => setPrimarySalaryWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-green-500"
            >
              <option value="">Pilih dompet utama penampung dana...</option>
              {wallets
                .filter((w) => !w.isLocked)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon || '🏦'} {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
            </select>
            <span className="text-[11px] text-slate-500">
              Dompet tempat uang pertama kali masuk sebelum dialokasikan ke tabungan beku / celengan.
            </span>
          </div>

          <FormField
            label="Target Rasio Tabungan Bulanan (%)"
            hint="Persentase dari gaji/uang saku yang ingin kamu simpan/investasikan (Rekomendasi ideal: 20%)."
          >
            <Input
              type="number"
              min={1}
              max={90}
              placeholder="20"
              value={savingsTarget}
              onChange={(e) => setSavingsTarget(e.target.value)}
              leftIcon={<Target className="w-4 h-4" />}
            />
          </FormField>

          {/* Real-time Calculation Preview Card */}
          {incomeNum > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/60 border border-slate-200 dark:border-[#2d3348] grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Target Disisihkan per Bulan ({targetPct}%):
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-green-600 dark:text-green-400">
                  {formatRupiah(monthlySavingsEst)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Estimasi Batas Belanja Harian:
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                  {formatRupiah(dailySafeEst)}/hari
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Keamanan & Privasi */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Keamanan & Data Pribadi</h4>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Data keuanganmu dienkripsi dan diisolasi dengan Google Cloud Firestore.
              </p>
            </div>
          </div>
          <Badge variant="brand" size="sm" className="shrink-0">
            Enkripsi
          </Badge>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            variant="glow"
            size="lg"
            loading={saving}
            className="w-full sm:w-auto"
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  )
}
