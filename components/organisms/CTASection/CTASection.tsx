'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, CheckCircle2, LayoutDashboard } from 'lucide-react'

export function CTASection() {
  const { user } = useAuth()

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[300px] bg-green-500/20 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-b from-green-50/80 via-white to-white dark:from-[#1a1d27] dark:via-[#1a1d27]/95 dark:to-[#131620] border border-green-500/30 p-8 sm:p-14 text-center shadow-xl dark:shadow-2xl overflow-hidden text-slate-900 dark:text-white">
          {/* Subtle grid mesh */}
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:24px_24px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
            <Badge variant="brand" size="md" dot className="mb-6">
              Mulai Langkah Pertama Hari Ini
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-5">
              Siap Memiliki Kontrol Penuh Atas Keuanganmu?
            </h2>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed mb-8">
              Bergabung sekarang bersama SaveMe. Gratis, cepat, dan tanpa ribet. Mulai catat
              transaksi pertamamu dalam hitungan detik.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-8">
              {user ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full sm:w-auto text-base px-8"
                    leftIcon={<LayoutDashboard className="w-5 h-5" />}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Buka Dashboard Saya
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button
                      variant="glow"
                      size="lg"
                      className="w-full sm:w-auto text-base px-8"
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                    >
                      Daftar Akun Gratis
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base">
                      Sudah Punya Akun? Masuk
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Quick Micro Bullet points */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span>Tanpa Biaya Langganan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span>Tanpa Iklan Mengganggu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span>Bebas Hapus Kapan Saja</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
