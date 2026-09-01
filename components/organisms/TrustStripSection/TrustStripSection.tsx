'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'

const TRUST_ITEMS = [
  'Catat pengeluaran simpel',
  'Insight finansial jernih',
  'Transaksi rapi & teratur',
  '100% privat & aman',
]

export function TrustStripSection() {
  return (
    <section className="py-10 border-y border-slate-100 dark:border-white/6 bg-slate-50/60 dark:bg-white/2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Semua yang kamu butuhkan untuk memahami keuanganmu.
          </p>
          <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-white/12" />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
