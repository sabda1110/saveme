'use client'

import React from 'react'
import { Lock, RefreshCw, X, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/atoms/Button'

interface NotificationPermissionGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export const NotificationPermissionGuideModal: React.FC<NotificationPermissionGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#1a1d27] border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Izin Notifikasi Diblokir
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browser Anda memblokir notifikasi untuk situs ini
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

        {/* Modal Body: Step-by-Step Instructions */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <p className="leading-relaxed">
            Karena izin pernah ditolak di browser, browser modern (Chrome, Edge, Safari, Firefox) mengunci pop-up izin otomatis. Anda perlu mengizinkannya secara manual melalui address bar:
          </p>

          <div className="space-y-3 bg-slate-50 dark:bg-[#21263a]/60 p-4 rounded-2xl border border-slate-200 dark:border-[#2d3348]">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="leading-relaxed">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Klik ikon Gembok / Setelan di URL Bar
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Di sebelah kiri nama alamat web (URL), klik ikon gembok <Lock className="w-3 h-3 inline mx-0.5" /> atau tombol setelan situs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="leading-relaxed">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Ubah Setelan Notifikasi
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Cari menu <strong>Notifikasi (Notifications)</strong>, lalu ubah dari <span className="text-rose-600 dark:text-rose-400 font-semibold">Blokir (Block)</span> menjadi <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Izinkan (Allow)</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="leading-relaxed">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Muat Ulang Halaman
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Setelah diubah, klik tombol muat ulang di bawah ini agar perubahan tersimpan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#131620] border-t border-slate-200 dark:border-[#2d3348] flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Tutup
          </Button>
          <Button
            type="button"
            variant="glow"
            size="sm"
            onClick={handleReload}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            Muat Ulang Halaman
          </Button>
        </div>
      </div>
    </div>
  )
}
