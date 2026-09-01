'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/atoms/Button'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Card3D } from './Card3D'

export function HeroSection() {
  const { user } = useAuth()

  return (
    <section className="relative pt-24 sm:pt-32 lg:pt-36 pb-16 sm:pb-24 overflow-hidden">
      {/* Subtle modern dot-grid background */}
      <div
        className="absolute inset-0 -z-10 opacity-60 dark:opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-white dark:to-[#0a0a0f]" />

      {/* Atmospheric emerald glow blob */}
      <div className="absolute top-10 right-1/4 w-[500px] h-[350px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* LEFT: Copy & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.08] mb-6">
              Kendalikan Penuh<br />
              <span className="text-emerald-600 dark:text-emerald-400">
                Keuangan Pribadimu.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-lg">
              Catat pengeluaran harian, pahami arus kas, dan bangun kebiasaan finansial lebih baik bersama SaveMe — 100% privat, mudah, dan gratis.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-6">
              {user ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full sm:w-auto px-8 text-base shadow-lg shadow-emerald-500/20"
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
                      className="w-full sm:w-auto px-8 text-base shadow-lg shadow-emerald-500/20"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Mulai Sekarang — Gratis
                    </Button>
                  </Link>
                  <a href="#cerita" className="w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto px-7 text-base"
                    >
                      Jelajahi SaveMe
                    </Button>
                  </a>
                </>
              )}
            </div>

            {/* Trust statement */}
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <ChevronDown className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
              <span>Tanpa spreadsheet ribet. Cara simpel kelola uangmu setiap hari.</span>
            </p>

            {/* Trust Metrics Pill Row */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 grid grid-cols-3 gap-6 w-full max-w-md">
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 dark:text-white">100%</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Data Terisolasi</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">Rp 0</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Gratis Selamanya</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 dark:text-white">Real-Time</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Saldo Langsung</span>
              </div>
            </div>
          </div>

          {/* RIGHT: 3D Interactive ATM / Debit Card Showcase */}
          <div className="lg:col-span-5 flex items-center justify-center relative py-6">
            <Card3D />
          </div>
        </div>
      </div>
    </section>
  )
}
