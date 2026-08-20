'use client'

import React from 'react'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { FeatureCard } from '@/components/molecules/FeatureCard'
import {
  Zap,
  Tag,
  PieChart,
  ShieldCheck,
  Lock,
} from 'lucide-react'

export function BentoFeatures() {
  return (
    <section id="fitur" className="py-20 sm:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badgeText="🚀 Fitur Unggulan"
          badgeVariant="brand"
          title={
            <>
              Didesain Khusus untuk{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-300">
                Kemudahan Hidupmu
              </span>
            </>
          }
          subtitle="Tidak perlu menjadi akuntan untuk mengelola keuangan. SaveMe menghilangkan semua kerumitan spreadsheet dan aplikasi keuangan kuno."
        />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {/* Card 1: Fast Entry (Large - 2 Cols on tablet/desktop) */}
          <FeatureCard
            gradient="green"
            icon={<Zap className="w-6 h-6 text-green-400" />}
            title="Catat Transaksi Kurang dari 10 Detik"
            description="Buka, ketik nominal, pilih kategori, simpan. UI yang responsif dan ringkas membuat proses mencatat pengeluaran tidak lagi menjadi beban harian."
            badge="Super Cepat"
            className="md:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Pilihan Cepat:</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#21263a] text-xs text-slate-300 border border-[#2d3348] flex items-center gap-1.5">
                🍔 Makanan
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#21263a] text-xs text-slate-300 border border-[#2d3348] flex items-center gap-1.5">
                🚗 Transport
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#21263a] text-xs text-slate-300 border border-[#2d3348] flex items-center gap-1.5">
                🛍️ Belanja
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#21263a] text-xs text-slate-300 border border-[#2d3348] flex items-center gap-1.5">
                💼 Gaji
              </span>
            </div>
          </FeatureCard>

          {/* Card 2: 100% Privacy */}
          <FeatureCard
            gradient="blue"
            icon={<Lock className="w-6 h-6 text-blue-400" />}
            title="100% Privat & Terisolasi"
            description="Data finansialmu sepenuhnya milikmu. Setiap transaksi diisolasi dengan token otentikasi ketat. Nol pelacak, nol iklan pihak ketiga."
            badge="Anti Bocor"
          >
            <div className="flex items-center gap-2 text-xs text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Proteksi database per pengguna</span>
            </div>
          </FeatureCard>

          {/* Card 3: Categorization */}
          <FeatureCard
            gradient="amber"
            icon={<Tag className="w-6 h-6 text-amber-400" />}
            title="Kategori Visual Lengkap"
            description="Tersedia 10 kategori default dengan ikon emoji yang jelas untuk membedakan pengeluaran wajib, hiburan, hingga sumber pemasukan."
            badge="10 Kategori"
          >
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <span>🍔</span> <span>Makanan & Minuman</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>📄</span> <span>Tagihan & Utilitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>💼</span> <span>Gaji & Pendapatan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>💊</span> <span>Kesehatan</span>
              </div>
            </div>
          </FeatureCard>

          {/* Card 4: Clear Insights (2 Cols on desktop) */}
          <FeatureCard
            gradient="purple"
            icon={<PieChart className="w-6 h-6 text-purple-400" />}
            title="Analisis Visual yang Langsung Dimengerti"
            description="Grafik komposisi pengeluaran dan ringkasan arus kas bulanan memberikan jawaban instan: ke mana saja uangmu mengalir setiap bulannya."
            badge="Dashboard Jernih"
            className="md:col-span-2"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span>Pemasukan vs Pengeluaran</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>Breakdown Kategori Terbanyak</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span>Perhitungan Saldo Otomatis</span>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}
