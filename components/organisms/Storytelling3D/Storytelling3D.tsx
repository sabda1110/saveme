'use client'

import React, { useState, useEffect } from 'react'
import {
  Utensils,
  Car,
  ShoppingBag,
  PieChart,
  PiggyBank,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function Storytelling3D() {
  const [savingsAmount, setSavingsAmount] = useState(1250000)
  const [coinDropped, setCoinDropped] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Cycle savings simulation every 3 seconds
  useEffect(() => {
    const steps = [1250000, 1500000, 2000000, 3500000]
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length
      setSavingsAmount(steps[idx])
      setCoinDropped(true)
      setTimeout(() => setCoinDropped(false), 800)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // Mouse tilt for floating 3D objects
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20
    setMousePos({ x, y })
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div id="cerita" className="relative py-20 sm:py-32 overflow-hidden">
      {/* Background radial accents */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            Kebebasan Finansial, <br />
            <span className="text-emerald-600 dark:text-emerald-400">Dimulai dari Kebiasaan Sederhana.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Pantau setiap fase pertumbuhan keuanganmu dengan visual interaktif SaveMe.
          </p>
        </div>

        {/* 3D Story Sequence Grid */}
        <div className="flex flex-col gap-24 sm:gap-36">

          {/* ========================================================================= */}
          {/* BABAK 1: TRACK YOUR SPENDING (Floating 3D Transaction Cards) */}
          {/* ========================================================================= */}
          <div
            onMouseMove={handleMouseMove}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
          >
            <div className="lg:col-span-6 flex flex-col items-start order-2 lg:order-1">
              <span className="text-xs font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                Babak 01 • Catat Real-Time
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
                Ketahui ke mana uangmu pergi.
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Ubah struk belanja dan pengeluaran harian jadi insight yang bermakna. Setiap jajan kopi, bensin, dan belanja bulanan otomatis terkelompokkan rapi dalam perspektif 3D.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-orange-500" /> Makanan &amp; Minuman
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-500" /> Transportasi
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-500" /> Belanja
                </span>
              </div>
            </div>

            {/* 3D Floating Transaction Cards Display */}
            <div
              className="lg:col-span-6 relative h-[360px] sm:h-[400px] flex items-center justify-center order-1 lg:order-2"
              style={{ perspective: 1000 }}
            >
              {/* Card 1: Food */}
              <div
                className="absolute z-30 left-4 sm:left-12 top-6 w-64 p-4 rounded-2xl bg-white/90 dark:bg-[#161922]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/15 shadow-2xl shadow-slate-900/10 transition-transform duration-200 ease-out"
                style={{
                  transform: `rotateX(${mousePos.y * 0.8 + 6}deg) rotateY(${mousePos.x * 0.8 - 12}deg) translateZ(40px)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg">
                      🍔
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">Makanan &amp; Minuman</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Restoran Sambal Bakar</p>
                    </div>
                  </div>
                  <span className="font-black text-rose-500 text-sm">-Rp 45.000</span>
                </div>
              </div>

              {/* Card 2: Transportation */}
              <div
                className="absolute z-20 left-16 sm:left-24 top-28 w-68 p-4 rounded-2xl bg-white/80 dark:bg-[#1a1e2a]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/15 shadow-2xl shadow-emerald-950/20 transition-transform duration-200 ease-out"
                style={{
                  transform: `rotateX(${mousePos.y * 0.6 + 2}deg) rotateY(${mousePos.x * 0.6 - 4}deg) translateZ(20px)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                      🚗
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">Transportasi</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Bensin Pertamax</p>
                    </div>
                  </div>
                  <span className="font-black text-rose-500 text-sm">-Rp 25.000</span>
                </div>
              </div>

              {/* Card 3: Shopping */}
              <div
                className="absolute z-10 right-4 sm:right-12 bottom-6 w-72 p-4 rounded-2xl bg-white/70 dark:bg-[#12151e]/85 backdrop-blur-md border border-slate-200/60 dark:border-white/10 shadow-xl transition-transform duration-200 ease-out"
                style={{
                  transform: `rotateX(${mousePos.y * 0.4 - 4}deg) rotateY(${mousePos.x * 0.4 + 10}deg) translateZ(-10px)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                      🛍️
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">Belanja</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Uniqlo Casual Outfit</p>
                    </div>
                  </div>
                  <span className="font-black text-rose-500 text-sm">-Rp 350.000</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BABAK 2: SAVE MORE (3D Ceramic Piggy Bank & Falling Coins) */}
          {/* ========================================================================= */}
          <div
            onMouseMove={handleMouseMove}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
          >
            {/* 3D Piggy Bank Object Display */}
            <div
              className="lg:col-span-6 relative h-[360px] sm:h-[420px] flex items-center justify-center"
              style={{ perspective: 1000 }}
            >
              {/* Falling Coins Animation Element */}
              <div
                className={cn(
                  'absolute z-30 top-4 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border-2 border-yellow-100 flex items-center justify-center text-amber-950 font-black text-sm shadow-xl shadow-amber-500/40 transition-all duration-700 ease-in-out',
                  coinDropped ? 'translate-y-28 scale-75 opacity-0' : '-translate-y-2 scale-100 opacity-100'
                )}
              >
                Rp
              </div>

              {/* Ceramic Piggy Bank 3D Visual Vessel */}
              <div
                className="relative z-20 w-72 sm:w-80 rounded-[36px] bg-gradient-to-b from-white via-slate-50 to-emerald-50 dark:from-[#1a202c] dark:via-[#161c28] dark:to-[#0f172a] border-2 border-emerald-400/40 dark:border-emerald-500/30 p-7 shadow-2xl shadow-emerald-500/20 text-center flex flex-col items-center justify-center transition-transform duration-200 ease-out"
                style={{
                  transform: `rotateX(${mousePos.y * 0.5 + 8}deg) rotateY(${mousePos.x * 0.5 - 6}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Coin Slot */}
                <div className="w-20 h-2.5 rounded-full bg-slate-900 dark:bg-black border border-emerald-400/60 shadow-inner mb-6" />

                {/* Piggy Icon */}
                <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
                  <PiggyBank className="w-10 h-10 stroke-[2.2]" />
                </div>

                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                  Celengan Impian (Terkunci Aman)
                </p>

                {/* Live Animated Savings Ticker */}
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  {formatCurrency(savingsAmount)}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Target 75% Tercapai</span>
                </div>
              </div>
            </div>

            {/* Copy Content */}
            <div className="lg:col-span-6 flex flex-col items-start">
              <span className="text-xs font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                Babak 02 • Tabungan Otomatis
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
                Bangun kebiasaan menabung yang konsisten.
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Pisahkan dana belanja harian dengan celengan impian. Uang tabungan terkunci aman dari godaan impulsif sehingga target liburan, dana darurat, dan impianmu tercapai pasti.
              </p>
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 w-full flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Prinsip Keuangan:</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">Pay Yourself First (50/30/20)</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BABAK 3: UNDERSTAND YOUR FINANCES (3D Perspective Growth Chart) */}
          {/* ========================================================================= */}
          <div
            onMouseMove={handleMouseMove}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
          >
            {/* Copy Content */}
            <div className="lg:col-span-6 flex flex-col items-start order-2 lg:order-1">
              <span className="text-xs font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                Babak 03 • Insight Mendalam
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
                Lihat gambaran besar keuanganmu.
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Ubah catatan transaksi harian menjadi evaluasi kesehatan finansial yang jelas. Pantau rasio likuiditas, alokasi gajian 50/30/20, dan batas belanja harian aman dalam grafik 3D yang jernih.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Pemasukan Kas</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">+Rp 8.500.000</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Jatah Belanja Aman</p>
                  <p className="text-base font-black text-blue-600 dark:text-blue-400">Rp 142.000 / hr</p>
                </div>
              </div>
            </div>

            {/* 3D Floating Chart Display */}
            <div
              className="lg:col-span-6 relative h-[360px] sm:h-[400px] flex items-center justify-center order-1 lg:order-2"
              style={{ perspective: 1000 }}
            >
              <div
                className="w-full max-w-[440px] rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/15 p-6 shadow-2xl transition-transform duration-200 ease-out"
                style={{
                  transform: `rotateX(${mousePos.y * 0.6 + 6}deg) rotateY(${mousePos.x * 0.6 - 8}deg) translateZ(30px)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-500" />
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Pertumbuhan &amp; Alokasi Bulanan</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                    +18.4% MoM
                  </span>
                </div>

                {/* Vertical Bar Chart Graphic */}
                <div className="flex items-end justify-between gap-3 h-40 pt-4 border-b border-slate-100 dark:border-white/8 pb-2">
                  {[
                    { month: 'Mei', h: '45%', color: 'bg-slate-300 dark:bg-slate-700' },
                    { month: 'Jun', h: '60%', color: 'bg-slate-300 dark:bg-slate-700' },
                    { month: 'Jul', h: '75%', color: 'bg-emerald-400 dark:bg-emerald-600' },
                    { month: 'Agu', h: '88%', color: 'bg-emerald-500 dark:bg-emerald-500' },
                    { month: 'Sep', h: '100%', color: 'bg-gradient-to-t from-emerald-600 to-teal-400', active: true },
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div
                        className={cn('w-full rounded-t-lg transition-all duration-500 shadow-md', bar.color)}
                        style={{ height: bar.h }}
                      />
                      <span className={cn('text-[10px] font-semibold', bar.active ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400')}>
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Category Distribution Bar */}
                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Kebutuhan (50%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400" /> Tabungan (30%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Keinginan (20%)
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
