'use client'

import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Flame,
  X,
  Send,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import {
  detectUserTimezone,
  requestNotificationPermission,
  getFCMRegistrationToken,
  type UserTimeZoneInfo,
} from '@/lib/firebase/messaging'
import { notificationService } from '@/lib/services/notification.firebase'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils/cn'

interface NotificationPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth()
  const [tzInfo, setTzInfo] = useState<UserTimeZoneInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTzInfo(detectUserTimezone())
    }
  }, [])

  if (!isOpen) return null

  const handleEnableNotifications = async () => {
    if (!user?.uid) return
    setLoading(true)
    setStatusMessage(null)

    try {
      // 1. Request Permission
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') {
        setStatusMessage({
          type: 'error',
          text: 'Izin notifikasi ditolak oleh browser. Silakan izinkan notifikasi di pengaturan browser Anda.',
        })
        setLoading(false)
        return
      }

      // 2. Get Detected Timezone
      const currentTz = detectUserTimezone()
      setTzInfo(currentTz)

      // 3. Get FCM Token
      const token = await getFCMRegistrationToken()
      const effectiveToken = token || `web_token_${user.uid}_${Date.now()}`

      // 4. Save to Firestore & Subscribe to Zone Topic
      await notificationService.saveUserFcmToken(user.uid, effectiveToken, currentTz)

      // 5. Send instant confirmation push / notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🔔 SaveMe: Pengingat Harian Aktif!', {
            body: `Pengingat jatah belanja akan dikirim setiap jam 07:00 ${currentTz.zoneCode}. Tetap hemat & aman sampai akhir bulan!`,
            icon: '/globe.svg',
          })
        } catch {
          // Ignore if constructor fails in some mobile browsers
        }
      }

      setStatusMessage({
        type: 'success',
        text: `Notifikasi berhasil diaktifkan untuk zona waktu ${currentTz.zoneCode}!`,
      })

      if (onSuccess) onSuccess()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: unknown) {
      console.error('[NotificationPromptModal] Error enabling notifications:', err)
      const errObj = err as { message?: string }
      setStatusMessage({
        type: 'error',
        text: errObj.message || 'Gagal mengaktifkan notifikasi.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Luxury Glow */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border-b border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Pengingat Jatah Belanja Harian
                </h3>
                <Badge variant="brand" size="sm">
                  FCM Push
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peringatan dini setiap pagi agar tidak boncos di akhir bulan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Benefits vs Risks */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Timezone Detection Banner */}
          {tzInfo && (
            <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-500/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold">
                  Zona Waktu Terdeteksi: <strong>{tzInfo.zoneCode}</strong> (Pukul 07:00 pagi)
                </span>
              </div>
              <Badge variant="neutral" size="sm">
                Otomatis
              </Badge>
            </div>
          )}

          {/* Feedback Message if any */}
          {statusMessage && (
            <div
              className={cn(
                'p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in',
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
              )}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Benefits (Keuntungan Jika Aktif) */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-[#21263a]/60 border border-emerald-500/25 space-y-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Keuntungan Mengaktifkan Notifikasi:
            </span>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <div>
                  <strong>Briefing Jatah Belanja Pagi (07:00 {tzInfo?.zoneCode || 'Lokal'}):</strong> Tahu persis batas belanja aman sebelum mulai beraktivitas harian.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <div>
                  <strong>Alarm Anti-Boncos:</strong> Diingatkan sebelum uang tabungan akhir bulan bocor atau terpakai.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <div>
                  <strong>Pengingat Tagihan & Cicilan:</strong> Diingatkan sebelum jatuh tempo agar bebas denda.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <div>
                  <strong>Update Celengan Impian:</strong> Pantau target impianmu bertumbuh secara berkala.
                </div>
              </li>
            </ul>
          </div>

          {/* 2. Risks (Risiko Jika Tidak Aktif) */}
          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/15 border border-rose-500/25 space-y-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Risiko Jika Tidak Diaktifkan:
            </span>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold shrink-0">✗</span>
                <div>
                  <strong>Belanja "Buta" (Blind Spending):</strong> Merasa saldo rekening masih banyak, padahal jatah belanja harian sudah habis.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold shrink-0">✗</span>
                <div>
                  <strong>Gaji Habis Sebelum Akhir Bulan:</strong> Overbudget harian terakumulasi tanpa disadari.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold shrink-0">✗</span>
                <div>
                  <strong>Lupa Bayar Tagihan:</strong> Terancam denda keterlambatan atau pemutusan layanan.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#131620] border-t border-slate-200 dark:border-[#2d3348] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Nanti Saja
          </Button>

          <Button
            type="button"
            variant="glow"
            size="md"
            onClick={handleEnableNotifications}
            loading={loading}
            leftIcon={<Bell className="w-4 h-4" />}
          >
            Aktifkan Sekarang
          </Button>
        </div>
      </div>
    </div>
  )
}
