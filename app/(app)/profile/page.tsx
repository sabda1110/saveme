'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
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
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Bell,
  Send,
  Clock,
  ChevronRight,
  DollarSign,
} from 'lucide-react'
import {
  detectUserTimezone,
  requestNotificationPermission,
  getFCMRegistrationToken,
  type UserTimeZoneInfo,
} from '@/lib/firebase/messaging'
import { notificationService } from '@/lib/services/notification.firebase'
import { cn } from '@/lib/utils/cn'

export default function ProfilePage() {
  const { user, userProfile, sessionInfo, refreshProfile, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  // Form State
  const [name, setName] = useState(userProfile?.name || '')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Notification State
  const [tzInfo, setTzInfo] = useState<UserTimeZoneInfo | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [isTestingNotif, setIsTestingNotif] = useState(false)
  const [testNotifResult, setTestNotifResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    if (userProfile?.name) {
      setName(userProfile.name)
    }
  }, [userProfile?.name])

  useEffect(() => {
    async function loadNotificationSettings() {
      if (!user?.uid) return
      try {
        const notifSettings = await notificationService.getSettings(user.uid)
        setNotifEnabled(notifSettings.enabled)
        setTzInfo(detectUserTimezone())
      } catch (err) {
        console.error('[profile] Error loading notification settings:', err)
      }
    }
    loadNotificationSettings()
  }, [user?.uid])

  const handleToggleNotification = async (enabled: boolean) => {
    if (!user?.uid) return
    setNotifLoading(true)
    setTestNotifResult(null)

    try {
      if (enabled) {
        const perm = await requestNotificationPermission()
        if (perm !== 'granted') {
          setErrorMessage(
            'Izin notifikasi ditolak di browser. Silakan aktifkan izin notifikasi di setelan browser.'
          )
          setNotifLoading(false)
          return
        }

        const currentTz = detectUserTimezone()
        setTzInfo(currentTz)
        const token = await getFCMRegistrationToken()
        const effectiveToken = token || `web_token_${user.uid}_${Date.now()}`

        await notificationService.saveUserFcmToken(user.uid, effectiveToken, currentTz)
        setNotifEnabled(true)
        setSuccessMessage(`Notifikasi harian berhasil diaktifkan untuk zona waktu ${currentTz.zoneCode}!`)
      } else {
        await notificationService.updatePreferences(user.uid, false)
        setNotifEnabled(false)
        setSuccessMessage('Notifikasi harian dinonaktifkan.')
      }
    } catch (err: unknown) {
      console.error('[profile] Error toggling notification:', err)
      const errObj = err as { message?: string }
      setErrorMessage(errObj.message || 'Gagal mengubah pengaturan notifikasi.')
    } finally {
      setNotifLoading(false)
    }
  }

  const handleSendTestNotification = async () => {
    if (!user?.uid) return
    setIsTestingNotif(true)
    setTestNotifResult(null)

    try {
      const currentTz = tzInfo || detectUserTimezone()
      const token = (await getFCMRegistrationToken()) || `web_token_${user.uid}`

      const res = await notificationService.sendTestPushNotification(
        user.uid,
        token,
        currentTz.zoneCode
      )

      setTestNotifResult(res)

      // Show native browser notification immediately as verification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🧪 SaveMe: Uji Coba Pengingat Harian', {
            body: 'Notifikasi berhasil terhubung! Batas belanja kamu siap dikirim setiap jam 07:00 pagi.',
            icon: '/globe.svg',
          })
        } catch {
          // ignore
        }
      }
    } catch (err: unknown) {
      console.error('[profile] Error sending test notification:', err)
      const errObj = err as { message?: string }
      setTestNotifResult({
        success: false,
        message: errObj.message || 'Gagal mengirim notifikasi uji coba.',
      })
    } finally {
      setIsTestingNotif(false)
    }
  }

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
      })

      await refreshProfile()
      setSuccessMessage('Nama profil berhasil disimpan!')
    } catch (err: unknown) {
      console.error('[profile] Error updating profile:', err)
      const errObj = err as { message?: string }
      setErrorMessage(errObj.message || 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

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
              Profil & Pengaturan Akun
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola data identitas, tema tampilan, preferensi notifikasi, dan keamanan sesi
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
                {userProfile?.incomeType === 'STUDENT_ALLOWANCE'
                  ? 'Pelajar / Mahasiswa'
                  : userProfile?.incomeType === 'FREELANCE_VARIABLE'
                  ? 'Freelance Bebas'
                  : 'Karyawan'}
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

        {/* Section 2: Quick Redirect ke Alokasi Gaji */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-950/20 via-white dark:via-[#1a1d27] to-white dark:to-[#1a1d27] border border-purple-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0 mt-0.5 sm:mt-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Mode Finansial &amp; Alokasi Gaji
                </h3>
                <Badge variant="brand" size="sm">
                  Tersentralisasi
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                Pengaturan mode pengguna (Karyawan / Pelajar / Freelance), nominal pemasukan bulanan, siklus gajian, dan pembagian pos tabungan 50/30/20 dikelola terpusat di halaman <strong>Alokasi Gaji &amp; Uang Saku</strong>.
              </p>
            </div>
          </div>

          <Link
            href="/payroll"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shrink-0 self-stretch sm:self-auto justify-center"
          >
            <span>Buka Alokasi Gaji</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Section 3: Pengingat & Notifikasi Harian (FCM & Multi-Zona Waktu) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl space-y-5 text-slate-900 dark:text-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2d3348]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Pengingat Jatah Belanja Harian
                  </h3>
                  <Badge variant={notifEnabled ? 'brand' : 'neutral'} size="sm">
                    {notifEnabled ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kirim notifikasi setiap jam 07:00 pagi waktu lokal (WIB / WITA / WIT)
                </p>
              </div>
            </div>
          </div>

          {/* Toggle Activation & Timezone Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] space-y-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                  Terima Notifikasi Briefing Pagi
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block leading-relaxed">
                  Otomatis dikirim ke HP / desktop setiap jam 07:00 waktu setempat tanpa perlu buka aplikasi.
                </span>
              </div>

              {/* Custom Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={notifEnabled}
                disabled={notifLoading}
                onClick={() => handleToggleNotification(!notifEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  notifEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700',
                  notifLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    notifEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Timezone Information Box */}
            {tzInfo && (
              <div className="pt-3 border-t border-slate-200 dark:border-[#2d3348] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Zona Waktu Terdeteksi: <strong>{tzInfo.zoneLabel}</strong>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Topic: daily-reminder-{tzInfo.zoneCode.toLowerCase()}
                </span>
              </div>
            )}
          </div>

          {/* Test Notification Action */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                🧪 Uji Coba Pengiriman Notifikasi
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 block mt-0.5">
                Kirim notifikasi langsung ke perangkat ini sekarang untuk menguji apakah notifikasi berhasil masuk.
              </span>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isTestingNotif}
              onClick={handleSendTestNotification}
              className="text-xs shrink-0 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Kirim Notifikasi Uji Coba
            </Button>
          </div>

          {/* Test Result Message */}
          {testNotifResult && (
            <div
              className={cn(
                'p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in',
                testNotifResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
              )}
            >
              {testNotifResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testNotifResult.message}</span>
            </div>
          )}
        </div>

        {/* Section 4: Keamanan & Privasi */}
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
            Simpan Nama Profil
          </Button>
        </div>
      </form>
    </div>
  )
}
