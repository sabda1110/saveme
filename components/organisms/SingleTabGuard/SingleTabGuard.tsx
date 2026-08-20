'use client'

import React from 'react'
import { useSingleTabGuard } from '@/lib/hooks/useSingleTabGuard'
import { Button } from '@/components/atoms/Button'
import { ShieldAlert, ArrowRight, XCircle } from 'lucide-react'

export function SingleTabGuard() {
  const { isBlocked, claimActiveTab } = useSingleTabGuard()

  if (!isBlocked) return null

  const handleCloseTab = () => {
    if (typeof window !== 'undefined') {
      window.close()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#161924] border border-[#2d3348] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Glow ambient background */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
          SaveMe Dibuka di Tab Lain
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
          Untuk mencegah duplikasi data transaksi dan menjaga akurasi perhitungan saldo kas Anda, SaveMe hanya dapat aktif di <strong>satu tab browser</strong> pada saat yang bersamaan.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            variant="ghost"
            size="md"
            onClick={handleCloseTab}
            className="w-full sm:w-1/2 justify-center text-xs text-slate-400 hover:text-white border border-[#2d3348]"
            leftIcon={<XCircle className="w-4 h-4" />}
          >
            Tutup Tab
          </Button>

          <Button
            variant="glow"
            size="md"
            onClick={claimActiveTab}
            className="w-full sm:w-1/2 justify-center text-xs font-bold"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Gunakan Tab Ini
          </Button>
        </div>

        <span className="text-[11px] text-slate-500 mt-5">
          Tab sebelumnya akan otomatis dijeda saat Anda mengambil alih sesi ini.
        </span>
      </div>
    </div>
  )
}
