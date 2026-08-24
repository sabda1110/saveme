'use client'

import React from 'react'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { Lock, KeyRound, Database, EyeOff } from 'lucide-react'

export function SecuritySection() {
  const securityPillars = [
    {
      icon: <Database className="w-5 h-5 text-green-600 dark:text-green-400" />,
      title: 'Firestore Rules Database Isolation',
      desc: 'Setiap baris data transaksi terikat secara permanen pada request.auth.uid. Cloud Firestore Security Rules menolak query lintas-pengguna di level database terdalam.',
    },
    {
      icon: <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Single-Tab Session Guard',
      desc: 'Proteksi konkurensi tab aktif mencegah konflik mutasi saldo dan menjamin keakuratan perhitungan arus kas saat membuka aplikasi.',
    },
    {
      icon: <KeyRound className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      title: 'Firebase Auth Enterprise Standard',
      desc: 'Otentikasi pengguna ditangani oleh Google Firebase Authentication dengan enkripsi token berkala dan proteksi brute-force.',
    },
    {
      icon: <EyeOff className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'Nol Penjualan Data & Bebas Pinjol',
      desc: 'SaveMe tidak terafiliasi dengan pinjaman online, broker asuransi, atau platform iklan. Datamu murni milikmu dan tidak akan pernah dijual.',
    },
  ]

  return (
    <section id="keamanan" className="py-20 sm:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badgeText="🛡️ Komitmen Privasi 100%"
          badgeVariant="income"
          title={
            <>
              Keamanan Finansialmu Adalah{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-300 to-teal-300">
                Prioritas Tertinggi Kami
              </span>
            </>
          }
          subtitle="Kami percaya data finansial pribadi adalah hal paling rahasia bagi setiap individu. SaveMe dibangun dari nol dengan prinsip privasi-pertama."
        />

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {securityPillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-[#1a1d27]/70 border border-slate-200 dark:border-[#2d3348] hover:border-green-500/30 transition-all duration-200 flex gap-4 shadow-xs dark:shadow-md text-slate-900 dark:text-white"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-center shrink-0">
                {pillar.icon}
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{pillar.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {pillar.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
