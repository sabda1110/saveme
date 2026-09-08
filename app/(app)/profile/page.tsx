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
  Lock,
  Unlock,
  KeyRound,
  CreditCard,
  Trash2,
  AlertTriangle,
  Sparkles,
  Smartphone,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import {
  detectUserTimezone,
  requestNotificationPermission,
  getFCMRegistrationToken,
  type UserTimeZoneInfo,
} from '@/lib/firebase/messaging'
import { notificationService } from '@/lib/services/notification.firebase'
import { SetPinModal } from '@/components/organisms/SetPinModal/SetPinModal'
import { NotificationPermissionGuideModal } from '@/components/molecules/NotificationPermissionGuideModal'
import { dispatchMorningBriefingNotification } from '@/components/organisms/MorningBriefingAlarm/MorningBriefingAlarm'
import { cn } from '@/lib/utils/cn'

export default function ProfilePage() {
  const { user, userProfile, sessionInfo, refreshProfile, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  // Form State
  const [name, setName] = useState(userProfile?.name || '')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Budget & Bills Preference
  const [deductBills, setDeductBills] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('saveme_deduct_bills_daily')
      if (saved !== null) return saved === 'true'
    }
    return userProfile?.deductBillsFromDaily ?? true
  })
  const [deductBillsLoading, setDeductBillsLoading] = useState(false)

  useEffect(() => {
    if (userProfile?.deductBillsFromDaily !== undefined) {
      setDeductBills(userProfile.deductBillsFromDaily)
      if (typeof window !== 'undefined') {
        localStorage.setItem('saveme_deduct_bills_daily', String(userProfile.deductBillsFromDaily))
      }
    }
  }, [userProfile?.deductBillsFromDaily])

  const handleToggleDeductBills = async (nextVal: boolean) => {
    if (!user?.uid) return
    setDeductBills(nextVal)
    if (typeof window !== 'undefined') {
      localStorage.setItem('saveme_deduct_bills_daily', String(nextVal))
    }
    setDeductBillsLoading(true)
    try {
      await updateUserProfile(user.uid, {
        deductBillsFromDaily: nextVal,
      })
      await refreshProfile()
      setSuccessMessage(
        nextVal
          ? 'Pengaturan tersimpan: Jatah belanja harian otomatis mengamankan dana cicilan.'
          : 'Pengaturan tersimpan: Jatah belanja harian dihitung tanpa memotong cicilan.'
      )
    } catch (err) {
      console.error('[profile] Error updating deductBillsFromDaily:', err)
      setErrorMessage('Gagal menyimpan preferensi anggaran.')
    } finally {
      setDeductBillsLoading(false)
    }
  }

  // Notification State
  const [tzInfo, setTzInfo] = useState<UserTimeZoneInfo | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [isTestingNotif, setIsTestingNotif] = useState(false)
  const [isSimulatingMorning, setIsSimulatingMorning] = useState(false)
  const [isPermissionGuideOpen, setIsPermissionGuideOpen] = useState(false)
  const [browserPermission, setBrowserPermission] = useState<
    'default' | 'granted' | 'denied' | 'unsupported'
  >('default')
  const [testNotifResult, setTestNotifResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // PIN Security State
  const [isSetPinModalOpen, setIsSetPinModalOpen] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  const handleTogglePin = async () => {
    if (!user?.uid) return
    if (!userProfile?.appPin) {
      setIsSetPinModalOpen(true)
      return
    }

    const nextState = !userProfile.isPinEnabled
    setPinLoading(true)
    try {
      await updateUserProfile(user.uid, {
        isPinEnabled: nextState,
      })
      await refreshProfile()
      setSuccessMessage(
        nextState
          ? 'Kunci PIN 6-digit berhasil diaktifkan!'
          : 'Kunci PIN 6-digit berhasil dinonaktifkan.'
      )
    } catch (err) {
      console.error('[profile] Error toggling pin:', err)
      setErrorMessage('Gagal mengubah pengaturan PIN.')
    } finally {
      setPinLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.name) {
      setName(userProfile.name)
    }
  }, [userProfile?.name])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setBrowserPermission(Notification.permission)
      } else {
        setBrowserPermission('unsupported')
      }
    }

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
        // Direct browser prompt and sync
        const notifResult = await notificationService.promptAndSyncNotification(user.uid)
        if (notifResult.status === 'granted') {
          setBrowserPermission('granted')
          setNotifEnabled(true)
          const currentTz = detectUserTimezone()
          setTzInfo(currentTz)
          toast.success(
            `Notifikasi briefing jam 07:00 berhasil diaktifkan untuk zona waktu ${currentTz.zoneCode}!`
          )
        } else if (notifResult.status === 'denied') {
          setBrowserPermission('denied')
          setIsPermissionGuideOpen(true)
          toast.error(
            'Izin notifikasi diblokir browser. Anda tidak akan menerima briefing jam 07:00 atau undangan celengan. Buka blokir di setelan browser.'
          )
        } else {
          setBrowserPermission('default')
          toast.info('Izin notifikasi browser belum diaktifkan.')
        }
      } else {
        await notificationService.updatePreferences(user.uid, false)
        setNotifEnabled(false)
        toast.info('Notifikasi briefing jam 07:00 dinonaktifkan.')
      }
    } catch (err: unknown) {
      console.error('[profile] Error toggling notification:', err)
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'Gagal mengubah pengaturan notifikasi.')
    } finally {
      setNotifLoading(false)
    }
  }

  // Simulate exact 07:00 AM briefing notification
  const handleSimulateMorningAlarm = async () => {
    if (!user?.uid) return
    setIsSimulatingMorning(true)
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'denied'
      ) {
        setIsPermissionGuideOpen(true)
        toast.error('Izin notifikasi diblokir browser. Izinkan terlebih dahulu.')
        return
      }

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission !== 'granted'
      ) {
        const perm = await requestNotificationPermission()
        setBrowserPermission(perm)
        if (perm !== 'granted') {
          if (perm === 'denied') setIsPermissionGuideOpen(true)
          toast.error('Izin notifikasi belum diaktifkan di browser.')
          return
        }
      }

      const result = await dispatchMorningBriefingNotification({
        userId: user.uid,
        userName: userProfile?.name,
        isSimulation: true,
      })

      if (result.success) {
        toast.success(
          `Simulasi berhasil! Notifikasi jatah ${result.formattedLimit} telah dikirim ke perangkat Anda.`
        )
      } else {
        toast.warning(
          'Notifikasi tidak dapat dipicu. Pastikan izin notifikasi diizinkan di browser/sistem operasi Anda.'
        )
      }
    } catch (err: unknown) {
      console.error('[profile] Error simulating morning alarm:', err)
      toast.error('Gagal menjalankan simulasi notifikasi pagi.')
    } finally {
      setIsSimulatingMorning(false)
    }
  }

  const handleSendTestNotification = async () => {
    if (!user?.uid) return
    setIsTestingNotif(true)
    setTestNotifResult(null)

    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'denied'
      ) {
        setIsPermissionGuideOpen(true)
        toast.error('Izin notifikasi diblokir browser.')
        return
      }

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission !== 'granted'
      ) {
        const perm = await requestNotificationPermission()
        setBrowserPermission(perm)
        if (perm !== 'granted') {
          if (perm === 'denied') setIsPermissionGuideOpen(true)
          toast.error('Izin notifikasi belum diaktifkan di browser.')
          return
        }
      }

      const currentTz = tzInfo || detectUserTimezone()
      const token = (await getFCMRegistrationToken()) || `web_token_${user.uid}`

      // Fire direct local browser notification first
      let localShown = false
      if ('serviceWorker' in navigator) {
        try {
          const reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
          ])
          if (reg && reg.showNotification) {
            await reg.showNotification('🧪 SaveMe: Uji Coba Pengingat Harian', {
              body: 'Notifikasi berhasil terhubung! Batas belanja harian kamu siap dikirim setiap jam 07:00 pagi.',
              icon: '/logo.svg',
              badge: '/logo.svg',
              data: { url: '/daily' },
            })
            localShown = true
          }
        } catch {
          // Fallback
        }
      }

      if (!localShown && 'Notification' in window) {
        try {
          new Notification('🧪 SaveMe: Uji Coba Pengingat Harian', {
            body: 'Notifikasi berhasil terhubung! Batas belanja harian kamu siap dikirim setiap jam 07:00 pagi.',
            icon: '/logo.svg',
          })
          localShown = true
        } catch {
          // ignore
        }
      }

      // Also call backend route
      const res = await notificationService.sendTestPushNotification(
        user.uid,
        token,
        currentTz.zoneCode
      )

      setTestNotifResult({
        success: localShown || res.success,
        message: localShown
          ? 'Notifikasi uji coba berhasil dikirim ke layar perangkat ini!'
          : res.message,
      })
      toast.success('Notifikasi uji coba berhasil dikirim ke perangkat ini!')
    } catch (err: unknown) {
      console.error('[profile] Error sending test notification:', err)
      const errObj = err as { message?: string }
      setTestNotifResult({
        success: false,
        message: errObj.message || 'Gagal mengirim notifikasi uji coba.',
      })
      toast.error('Gagal mengirim notifikasi uji coba.')
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

        {/* Section 2.5: Preferensi Anggaran & Jatah Belanja (Global) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl space-y-4 text-slate-900 dark:text-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2d3348]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Preferensi Anggaran &amp; Jatah Belanja
                  </h3>
                  <Badge variant={deductBills ? 'brand' : 'neutral'} size="sm">
                    {deductBills ? 'Amankan Cicilan' : 'Tanpa Potong'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Konfigurasi global perhitungan jatah harian di Dashboard dan halaman Jatah
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] space-y-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                  Potong Cicilan &amp; Tagihan Bulanan
                </span>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  {deductBills ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      🛡️ <strong>Aktif (Disarankan):</strong> Tagihan dan cicilan yang belum lunas bulan ini otomatis disisihkan dari kas belanja. Kamu terlindungi dari risiko tekor saat tagihan jatuh tempo.
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      ⚡ <strong>Nonaktif:</strong> Seluruh saldo kas aktif dihitung bebas untuk belanja harian tanpa menyisihkan cicilan. Cocok jika kamu memiliki dana terpisah untuk tagihan.
                    </span>
                  )}
                </p>
              </div>

              {/* Custom Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={deductBills}
                disabled={deductBillsLoading}
                onClick={() => handleToggleDeductBills(!deductBills)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1',
                  deductBills ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700',
                  deductBillsLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    deductBills ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Pembersihan & Reset Transaksi */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-rose-950/20 via-white dark:via-[#1a1d27] to-white dark:to-[#1a1d27] border border-rose-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0 mt-0.5 sm:mt-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Pembersihan &amp; Reset Transaksi
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Data Reset
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Hapus riwayat transaksi berdasarkan rentang tanggal atau bersihkan seluruh catatan lama untuk memulai lembaran baru dengan opsi mempertahankan saldo atau mengatur ulang saldo kantong.
              </p>
            </div>
          </div>
          <Link
            href="/transactions?action=bulk-delete"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <span>Buka Pembersihan</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Section 3: Pengingat & Notifikasi Harian (FCM & Multi-Zona Waktu) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl space-y-5 text-slate-900 dark:text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2d3348] gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Pengingat Jatah Belanja Harian
                  </h3>
                  <Badge variant={notifEnabled ? 'brand' : 'neutral'} size="sm">
                    {notifEnabled ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  {browserPermission === 'denied' ? (
                    <Badge variant="warning" size="sm">
                      ⚠️ Izin Browser: Diblokir
                    </Badge>
                  ) : browserPermission === 'granted' ? (
                    <Badge variant="brand" size="sm">
                      ✓ Izin Browser: Diizinkan
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Izin Browser: Belum Diatur
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kirim notifikasi setiap jam 07:00 pagi waktu lokal (WIB / WITA / WIT)
                </p>
              </div>
            </div>
          </div>

          {/* Browser Permission Blocked Alert */}
          {browserPermission === 'denied' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Izin Notifikasi Diblokir oleh Browser Anda</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Browser Anda melarang pop-up notifikasi untuk situs ini. Buka setelan di bilah URL (ikon gembok) untuk mengizinkan.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPermissionGuideOpen(true)}
                className="text-xs shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold"
              >
                Panduan Buka Blokir
              </Button>
            </div>
          )}

          {/* Toggle Activation & Timezone Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] space-y-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                  Terima Notifikasi Briefing Jam 07:00 Pagi
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

          {/* iOS / iPhone PWA Background Push Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-500/30 flex items-start gap-3 text-xs">
            <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-indigo-950 dark:text-indigo-200 block">
                Catatan Khusus Pengguna iPhone / iPad (iOS)
              </span>
              <p className="text-[11px] text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed">
                Apple mewajibkan aplikasi ditambahkan ke Layar Utama agar notifikasi tetap masuk saat aplikasi ditutup:
                Buka Safari &gt; tekan tombol <strong>Bagikan (Share)</strong> &gt; pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
              </p>
            </div>
          </div>

          {/* Test & Simulation Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Action 1: Simulate exact 07:00 AM briefing */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Simulasikan Jam 07:00 Pagi
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-1 leading-relaxed">
                  Hitung jatah belanja harian live dan kirim notifikasi briefing pagi sekarang persis seperti yang akan muncul jam 7 pagi.
                </span>
              </div>

              <Button
                type="button"
                variant="glow"
                size="sm"
                loading={isSimulatingMorning}
                onClick={handleSimulateMorningAlarm}
                className="text-xs font-bold w-full"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Simulasikan Notifikasi Jam 07:00
              </Button>
            </div>

            {/* Action 2: Quick Test Notification */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/30 flex flex-col justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Uji Koneksi Notifikasi
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-400 block mt-1 leading-relaxed">
                  Kirim notifikasi uji coba cepat ke perangkat ini untuk memastikan browser mengizinkan notifikasi masuk.
                </span>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={isTestingNotif}
                onClick={handleSendTestNotification}
                className="text-xs w-full text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/10 font-semibold"
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Kirim Notifikasi Uji Coba
              </Button>
            </div>
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

          {/* How It Works & Reliability Notes */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a]/40 border border-slate-200 dark:border-[#2d3348] space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              Cara Kerja Pengingat Jam 07:00 Pagi di SaveMe:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
              <li>
                <strong>Saat Aplikasi / Tab Aktif:</strong> Alarm cerdas SaveMe di browser akan otomatis membunyikan dan memunculkan notifikasi briefing pagi tepat jam 07:00:00 waktu setempat (WIB/WITA/WIT).
              </li>
              <li>
                <strong>Morning Catch-Up:</strong> Jika Anda membuka SaveMe pertama kali setelah jam 07:00 pagi, briefing jatah hari itu akan otomatis disajikan.
              </li>
              <li>
                <strong>Saat Browser Ditutup Total:</strong> Notifikasi latar belakang memerlukan Service Worker terpasang dan izin notifikasi aktif di browser Anda.
              </li>
            </ul>
          </div>
        </div>

        {/* Section 4: Kunci PIN Keamanan Aplikasi */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2d3348]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Kunci Aplikasi (PIN 6-Digit)
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Lindungi akses saldo dan riwayat keuangan dengan PIN rahasia saat membuka aplikasi
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={pinLoading}
              onClick={handleTogglePin}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                userProfile?.isPinEnabled && userProfile?.appPin
                  ? 'bg-emerald-500'
                  : 'bg-slate-200 dark:bg-[#2d3348]'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  userProfile?.isPinEnabled && userProfile?.appPin
                    ? 'translate-x-5'
                    : 'translate-x-0'
                )}
              />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  userProfile?.isPinEnabled && userProfile?.appPin
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : 'bg-slate-400'
                )}
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Status:{' '}
                <strong>
                  {userProfile?.isPinEnabled && userProfile?.appPin
                    ? 'Aktif (Aplikasi Terkunci)'
                    : 'Nonaktif'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsSetPinModalOpen(true)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
                leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              >
                {userProfile?.appPin ? 'Ubah PIN 6-Digit' : 'Buat PIN 6-Digit'}
              </Button>
            </div>
          </div>
        </div>

        {/* Section 5: Keamanan & Privasi */}
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

      {/* Set/Change PIN Modal */}
      <SetPinModal
        isOpen={isSetPinModalOpen}
        userId={user?.uid || ''}
        hasExistingPin={Boolean(userProfile?.appPin)}
        onClose={() => setIsSetPinModalOpen(false)}
        onSuccess={async () => {
          await refreshProfile()
          setSuccessMessage('PIN 6-digit keamanan aplikasi berhasil disimpan!')
        }}
      />

      {/* Notification Permission Blocked Guide Modal */}
      <NotificationPermissionGuideModal
        isOpen={isPermissionGuideOpen}
        onClose={() => setIsPermissionGuideOpen(false)}
      />
    </div>
  )
}
