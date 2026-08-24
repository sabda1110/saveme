'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/atoms/Button'
import { useAuth } from '@/context/AuthContext'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
  LayoutDashboard,
} from 'lucide-react'

export function HeroSection() {
  const { user } = useAuth()

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-green-500/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] text-xs text-slate-700 dark:text-slate-300 mb-8 shadow-xs dark:shadow-inner hover:border-green-500/40 transition-colors">
            <span className="flex h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 animate-ping" />
            <span className="font-bold text-green-600 dark:text-green-400">SaveMe 2.0</span>
            <span className="text-slate-400 dark:text-slate-500">|</span>
            <span>AI Receipt Scanner, Segregasi Kas &amp; Smart Payroll</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6">
            Kendalikan Kas,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 dark:from-green-400 dark:via-emerald-300 dark:to-teal-400">
              Amankan Tabungan,
            </span>{' '}
            Bebas Overspending.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed mb-10 max-w-2xl">
            Solusi cerdas kelola keuangan harian dengan <strong className="text-slate-900 dark:text-slate-200">AI Receipt Scanner</strong>, segregasi kas belanja vs tabungan beku, jatah harian dinamis, dan distribusi gajian otomatis.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-14">
            {user ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full sm:w-auto text-base"
                  leftIcon={<LayoutDashboard className="w-5 h-5" />}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Buka Dashboard Saya
                </Button>
              </Link>
            ) : (
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full sm:w-auto text-base px-7"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Mulai Bebas Finansial
                </Button>
              </Link>
            )}

            <a href="#simulator" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto text-base px-6"
                leftIcon={<Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />}
              >
                Coba Simulator Finansial
              </Button>
            </a>
          </div>

          {/* Trust Value Props Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs sm:text-xs text-slate-700 dark:text-slate-300 font-medium pt-6 border-t border-slate-200 dark:border-[#2d3348]/60 w-full max-w-2xl">
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>AI Receipt Scanner</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <span>Kas &amp; Celengan Terpisah</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>Jatah Harian Dinamis</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>100% Data Terisolasi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
