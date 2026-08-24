'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft } from 'lucide-react'

export interface AuthTemplateProps {
  children: React.ReactNode
}

export function AuthTemplate({ children }: AuthTemplateProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-[#f1f5f9] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Memeriksa status sesi...</span>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-[#f1f5f9] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mb-3" />
        <span className="text-xs text-green-600 dark:text-green-400 font-mono">Sesi aktif ditemukan. Mengarahkan ke Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-[#f1f5f9] flex flex-col items-center justify-center p-4 sm:p-6 bg-mesh-pattern overflow-hidden transition-colors">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 grid-bg-overlay pointer-events-none opacity-40 -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-green-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Brand & Theme Toggle & Back to Home */}
      <div className="w-full max-w-md flex items-center justify-between mb-8 z-10">
        <BrandLogo size="md" />
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-[#1a1d27]/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-md z-10">{children}</div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 z-10">
        © {new Date().getFullYear()} SaveMe — Aman, Privat, dan Andal.
      </div>
    </div>
  )
}
