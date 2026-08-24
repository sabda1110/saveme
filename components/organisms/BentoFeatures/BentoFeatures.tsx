'use client'

import React from 'react'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { FeatureCard } from '@/components/molecules/FeatureCard'
import {
  Sparkles,
  Wallet,
  Compass,
  DollarSign,
  Zap,
  PieChart,
  ShieldCheck,
  Camera,
  Target,
  CreditCard,
  HeartPulse,
} from 'lucide-react'

export function BentoFeatures() {
  return (
    <section id="fitur" className="py-20 sm:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badgeText="🚀 Ekosistem Finansial Terpadu"
          badgeVariant="brand"
          title={
            <>
              Fitur Lengkap untuk{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 dark:from-green-400 dark:to-teal-300">
                Kemandirian Finansialmu
              </span>
            </>
          }
          subtitle="Bukan sekadar pencatat pengeluaran biasa. SaveMe dirancang dengan kecerdasan AI dan prinsip keuangan modern agar setiap rupiah yang kamu miliki bekerja optimal."
        />

        {/* Bento Grid Layout (6 Comprehensive Feature Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: AI Smart Receipt Scanner (Large - 2 Cols on tablet/desktop) */}
          <FeatureCard
            gradient="purple"
            icon={<Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            title="AI Smart Receipt Scanner"
            description="Cukup foto struk belanja Indomaret, Alfamart, restoran, atau bensin. Gemini 3.6 Vision mengekstrak nama merchant, total belanja, tanggal, dan rincian item otomatis tanpa input manual."
            badge="Gemini Vision"
            className="md:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Deteksi Otomatis:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#21263a] text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2d3348] flex items-center gap-1.5 font-mono">
                🏪 Merchant / Toko
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#21263a] text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2d3348] flex items-center gap-1.5 font-mono">
                💵 Total Belanja
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#21263a] text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2d3348] flex items-center gap-1.5 font-mono">
                📅 Tanggal Transaksi
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#21263a] text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2d3348] flex items-center gap-1.5 font-mono">
                🏷️ Auto Kategori
              </span>
            </div>
          </FeatureCard>

          {/* Card 2: Segregasi Kas vs Tabungan Beku */}
          <FeatureCard
            gradient="green"
            icon={<Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />}
            title="Segregasi Kas & Celengan"
            description="Pemisahan tegas antara uang belanja operasional dan tabungan beku. Tabungan impian terkunci aman sehingga kamu tidak overspending."
            badge="Multi-Wallet"
          >
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
              <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <span>Proteksi tabungan beku dari belanja harian</span>
            </div>
          </FeatureCard>

          {/* Card 3: Safe-to-Spend & AI Coach */}
          <FeatureCard
            gradient="green"
            icon={<Compass className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
            title="Jatah Harian Dinamis & AI Coach"
            description="Menghitung batas belanja aman per hari secara real-time berdasarkan sisa hari gajian. Dilengkapi SaveMe AI Financial Coach dengan mode Santai, Seimbang, atau Ketat."
            badge="Safe-to-Spend"
          >
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Budget per hari dinamis sesuai sisa kas</span>
            </div>
          </FeatureCard>

          {/* Card 4: Smart Payroll & Proteksi Cicilan */}
          <FeatureCard
            gradient="amber"
            icon={<DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
            title="Smart Payroll & Proteksi DSR"
            description="Distribusi gajian instan dengan preset cerdas (Pay Yourself First 50/30/20, 100% Kas Belanja, dsb.), Debt Service Ratio meter, dan proteksi saldo kurang saat cicilan jatuh tempo."
            badge="Payroll Hub"
          >
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Pencegahan overdraft cicilan & audit hutang</span>
            </div>
          </FeatureCard>

          {/* Card 5: Quick Templates */}
          <FeatureCard
            gradient="blue"
            icon={<Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            title="Template Catat Cepat 1-Klik"
            description="Simpan pengeluaran rutin harian seperti rokok/vape, parkir motor, kopi pagi, atau bensin. Cukup satu klik untuk mencatat tanpa mengetik ulang dari awal."
            badge="Fast Entry"
          >
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348]">☕ Kopi</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348]">🛵 Parkir</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348]">⛽ Bensin</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348]">🚬 Kebutuhan Rutin</span>
            </div>
          </FeatureCard>

          {/* Card 6: Financial Health Score 4-Pilar (Large - 2 Cols on desktop) */}
          <FeatureCard
            gradient="purple"
            icon={<PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            title="Financial Health Score & Laporan MoM"
            description="Evaluasi kesehatan finansialmu secara objektif berdasarkan 4 pilar utama: Rasio Likuiditas, Rasio Tabungan, Beban Hutang (DSR), dan Stabilitas Arus Kas dengan analisis Month-over-Month."
            badge="Health Score"
            className="md:col-span-2 lg:col-span-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span>Rasio Likuiditas Kas</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Rasio Tabungan Impian</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Audit Beban Hutang (DSR)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#21263a]/50 border border-slate-200 dark:border-[#2d3348] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Diagnosis Rekomendasi AI</span>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}
