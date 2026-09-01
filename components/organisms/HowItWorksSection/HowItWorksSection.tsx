'use client'

import React from 'react'
import { UserPlus, PlusCircle, LineChart } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Buat Akun Gratis',
    description: 'Daftar dalam hitungan detik — tanpa kartu kredit, cukup gunakan email aktifmu.',
  },
  {
    number: '02',
    icon: <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Catat Transaksi Harian',
    description: 'Masukkan pemasukan dan pengeluaran harianmu dengan cepat sesuai kantong kas.',
  },
  {
    number: '03',
    icon: <LineChart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Amankan Masa Depan Finansial',
    description: 'Pantau jatah belanja harian, kunci tabungan impian, dan nikmati kebebasan finansial.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="cara-kerja" className="py-20 sm:py-28 bg-slate-50 dark:bg-[#0d0d14] scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">Cara Kerja</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Mulai dalam 3 langkah mudah.
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-8 left-[16.666%] right-[16.666%] h-px bg-slate-200 dark:bg-white/10 -z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center lg:items-start text-center lg:text-left">
                {/* Vertical timeline connector (mobile) */}
                {i < STEPS.length - 1 && (
                  <div className="lg:hidden absolute top-16 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-200 dark:bg-white/10" />
                )}

                {/* Step number + icon */}
                <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 shadow-sm mb-6">
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center">
                    {step.number.slice(-1)}
                  </span>
                  {step.icon}
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-1">Langkah {step.number}</p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
