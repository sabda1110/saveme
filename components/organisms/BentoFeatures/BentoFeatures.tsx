'use client'

import React from 'react'
import { Receipt, PieChart, TrendingUp, LayoutList } from 'lucide-react'

const FEATURES = [
  {
    icon: <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Catat Pengeluaran Cepat',
    description: 'Catat pengeluaran harian dalam hitungan detik agar seluruh mutasi kas tetap terorganisir.',
  },
  {
    icon: <PieChart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Pahami Pola Belanja',
    description: 'Lihat ke mana uangmu mengalir lewat laporan visual dan pembagian kategori yang mudah dimengerti.',
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Pantau Pemasukan & Gajian',
    description: 'Catat semua sumber penghasilan dan distribusikan otomatis dengan formula cerdas 50/30/20.',
  },
  {
    icon: <LayoutList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Ruang Kerja Rapi & Teratur',
    description: 'Kelola kantong belanja, celengan impian, dan transaksi dalam satu tampilan yang bersih bebas distraksi.',
  },
]

export function BentoFeatures() {
  return (
    <section id="fitur" className="py-20 sm:py-28 bg-slate-50 dark:bg-[#0d0d14] scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-xl mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">Fitur Utama</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            Semua yang kamu butuhkan untuk kelola kas harian.
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Dirancang untuk semua orang — tanpa istilah keuangan rumit, tanpa konfigurasi yang membingungkan.
          </p>
        </div>

        {/* 2×2 Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="group p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/8 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
