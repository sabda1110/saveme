'use client'

import React from 'react'
import { HelpCircle, TrendingDown, PiggyBank } from 'lucide-react'

const PROBLEMS = [
  {
    icon: <HelpCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
    question: '"Ke mana habisnya uangku bulan ini?"',
    body: 'Kamu merasa penghasilanmu cukup, tapi setiap akhir bulan saldo mendadak tipis tanpa jejak pengeluaran yang jelas.',
  },
  {
    icon: <TrendingDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
    question: '"Apakah gaya hidupku terlalu boros?"',
    body: 'Ada kekhawatiran overspending tapi tidak punya patokan pasti berapa batas maksimal belanja yang aman per hari.',
  },
  {
    icon: <PiggyBank className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
    question: '"Berapa yang sebenarnya bisa kutabung?"',
    body: 'Ingin menabung konsisten untuk masa depan tapi ragu berapa sisa kas yang aman dibelanjakan hari ini tanpa mengorbankan esok.',
  },
]

export function ProblemSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            Mengelola keuangan seharusnya tidak terasa rumit.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            SaveMe memberikan gambaran finansial yang jernih — tanpa spreadsheet njelimet atau alat yang membingungkan.
          </p>
        </div>

        {/* Problem cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PROBLEMS.map((p, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/16 hover:shadow-md transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/6 flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{p.question}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
