'use client'

import React from 'react'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { WifiOff, Wifi, CloudCheck } from 'lucide-react'

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus()

  // If online and wasn't recently offline, don't show anything
  if (isOnline && !wasOffline) {
    return null
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={!isOnline ? 'Status koneksi: Mode Offline' : 'Status koneksi: Kembali Online'}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in fade-in slide-in-from-top-4 flex items-center gap-2.5 max-w-[92vw] sm:max-w-md pointer-events-none select-none"
      style={{
        backgroundColor: !isOnline ? 'rgba(26, 29, 39, 0.92)' : 'rgba(20, 83, 45, 0.92)',
        borderColor: !isOnline ? 'rgba(248, 113, 113, 0.4)' : 'rgba(74, 222, 128, 0.5)',
      }}
    >
      {!isOnline ? (
        <>
          <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              <p className="text-xs font-bold text-red-300">Mode Offline Aktif</p>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              Transaksi tetap tersimpan di HP &amp; otomatis sinkron saat online.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-6 h-6 rounded-lg bg-green-500/20 text-green-300 flex items-center justify-center shrink-0">
            <CloudCheck className="w-4 h-4 text-green-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-green-300" />
              <p className="text-xs font-bold text-green-200">Kembali Online</p>
            </div>
            <p className="text-[11px] text-green-100 truncate">
              Koneksi pulih. Data berhasil disinkronkan ke Cloud!
            </p>
          </div>
        </>
      )}
    </aside>
  )
}
