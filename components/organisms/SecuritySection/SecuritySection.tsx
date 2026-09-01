'use client'

import React from 'react'
import { Zap, BookOpen, ShieldCheck, Smartphone } from 'lucide-react'

const BENEFITS = [
  {
    icon: <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    label: 'Simpel',
    title: 'Tanpa alat keuangan yang membingungkan.',
    description: 'SaveMe menghilangkan kerumitan. Cukup catat, pantau jatah harian, dan pahami ke mana uangmu bergerak.',
  },
  {
    icon: <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    label: 'Jernih',
    title: 'Pahami kondisi kas tanpa rumus spreadsheet.',
    description: 'Laporan visual dan ringkasan transaksi memberikan kejelasan instan tentang posisi keuanganmu.',
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    label: '100% Privat',
    title: 'Data keuanganmu murni milikmu seutuhnya.',
    description: 'Data terisolasi aman di akun pribadimu. Kami tidak pernah menjual data, menampilkan iklan, atau membagikannya ke pihak ketiga.',
  },
  {
    icon: <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    label: 'Akses Fleksibel',
    title: 'Kelola keuangan di mana pun dan kapan pun.',
    description: 'Dapat diinstall langsung di HP sebagai Progressive Web App (PWA), cepat, ringan, dan tanpa makan memori.',
  },
]

export function SecuritySection() {
  return (
    <section id="keunggulan" className="py-20 sm:py-28 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-xl mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">Keunggulan</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Dibuat untuk memudahkan pengelolaan uangmu.
          </h2>
        </div>

        {/* Benefit grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              className="group flex gap-5 p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-[#111118] border border-slate-200 dark:border-white/8 hover:border-emerald-500/25 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                {b.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1">{b.label}</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{b.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
