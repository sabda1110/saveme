'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/atoms/Button'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, LayoutDashboard } from 'lucide-react'

export function CTASection() {
  const { user } = useAuth()

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 dark:bg-[#0f1f14] px-8 sm:px-16 py-16 sm:py-20 text-center">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* Green ambient blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full bg-emerald-600/20 blur-[80px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-5">
              Mulai kendalikan keuanganmu hari ini.
            </h2>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-10">
              Ambil langkah pertama menuju kebiasaan finansial yang lebih sehat bersama SaveMe — privat, simpel, dan 100% gratis.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {user ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full sm:w-auto px-10"
                    leftIcon={<LayoutDashboard className="w-5 h-5" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
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
                      className="w-full sm:w-auto px-10"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Mulai Sekarang — Gratis
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto px-8 border border-white/15 bg-white/8 text-white hover:bg-white/15 transition-colors"
                    >
                      Sudah Punya Akun? Masuk
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
