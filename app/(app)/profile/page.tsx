'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { updateUserProfile } from '@/lib/auth/firebase-auth'
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
} from 'lucide-react'

export default function ProfilePage() {
  const { user, userProfile, sessionInfo, refreshProfile, logout } = useAuth()

  // Form State initialized from userProfile
  const [name, setName] = useState(userProfile?.name || '')
  const [monthlyIncome, setMonthlyIncome] = useState(
    userProfile?.monthlyIncome ? userProfile.monthlyIncome.toString() : ''
  )
  const [savingsTarget, setSavingsTarget] = useState(
    userProfile?.savingsTarget ? userProfile.savingsTarget.toString() : '20'
  )
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    if (!user?.uid) return
    if (!name.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong')
      return
    }

    setSaving(true)
    try {
      await updateUserProfile(user.uid, {
        name: name.trim(),
        monthlyIncome: Number(monthlyIncome) || 0,
        savingsTarget: Number(savingsTarget) || 20,
      })

      await refreshProfile()
      setSuccessMessage('Pengaturan profil & finansial berhasil disimpan!')
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
          <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
            <User className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              Profil & Pengaturan Finansial
            </h1>
            <p className="text-xs text-slate-400">
              Kelola data akun, gaji pokok bulanan, dan target rasio menabungmu
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-xs sm:text-sm text-green-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs sm:text-sm text-red-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 border border-green-400/40 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-xl">
            {userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {userProfile?.name || 'Pengguna SaveMe'}
              </h2>
              <Badge variant="brand" size="sm">
                {userProfile?.role || 'USER'}
              </Badge>
            </div>
            <span className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1 font-mono">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </span>

            {/* Session Security Indicator */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sesi Aktif: Sisa {sessionInfo?.daysLeft ?? 7} hari
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                (Batas Keamanan 7 Hari)
              </span>
            </div>

            <span className="text-[10px] text-slate-500 mt-1.5 font-mono">
              UID: {user?.uid}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 text-xs w-full sm:w-auto"
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Keluar dari Akun
        </Button>
      </div>

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 sm:gap-6">
        {/* Section 1: Informasi Dasar */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2d3348]">
            <User className="w-4 h-4 text-green-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Informasi Dasar</h3>
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

        {/* Section 2: Fondasi Finansial & Target */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex flex-col gap-4 sm:gap-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2d3348]">
            <Sliders className="w-4 h-4 text-green-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Fondasi Keuangan & Target Tabungan
            </h3>
          </div>

          <FormField
            label="Estimasi Pemasukan Pokok / Gaji Bulanan (Rp)"
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

          <FormField
            label="Target Rasio Tabungan Bulanan (%)"
            hint="Persentase dari gaji yang ingin kamu simpan/investasikan (Rekomendasi ideal: 20%)."
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
            <div className="p-4 rounded-2xl bg-[#21263a]/60 border border-[#2d3348] grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400">
                  Target Disisihkan per Bulan ({targetPct}%):
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-green-400">
                  {formatRupiah(monthlySavingsEst)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400">
                  Estimasi Batas Belanja Harian:
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-200">
                  {formatRupiah(dailySafeEst)}/hari
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Keamanan & Privasi */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Keamanan & Data Pribadi</h4>
              <p className="text-[11px] sm:text-xs text-slate-400">
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
