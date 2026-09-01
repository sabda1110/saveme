'use client'

import React, { useState } from 'react'
import { Eye, Sparkles, TrendingUp, ShieldCheck, PieChart, ArrowUpRight, Zap } from 'lucide-react'

const CALLOUTS = [
  {
    icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
    text: 'Jatah Belanja Harian Dinamis',
    position: '-top-6 left-4 sm:left-12',
    accent: 'border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
  },
  {
    icon: <ShieldCheck className="w-4 h-4 text-teal-500" />,
    text: 'Proteksi Celengan Impian Terkunci',
    position: '-bottom-6 left-6 sm:left-16',
    accent: 'border-teal-500/30 bg-teal-50/90 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300',
  },
  {
    icon: <PieChart className="w-4 h-4 text-blue-500" />,
    text: 'Distribusi Gajian 50/30/20 Otomatis',
    position: 'top-1/3 -right-4 sm:-right-8',
    accent: 'border-blue-500/30 bg-blue-50/90 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300',
  },
]

export function LiveDashboardPreview() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section id="preview" className="py-20 sm:py-32 relative overflow-hidden scroll-mt-16">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            Keuanganmu. <br />
            <span className="text-emerald-600 dark:text-emerald-400">Satu pandangan jernih.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Antarmuka komprehensif dan bebas distraksi yang dirancang untuk kendali penuh atas arus kas, tabungan, dan masa depan finansialmu.
          </p>
        </div>

        {/* 3D Perspective Isometric Container */}
        <div
          className="relative max-w-5xl mx-auto"
          style={{ perspective: 1400 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Floating Callout Badges */}
          {CALLOUTS.map((c, i) => (
            <div
              key={i}
              className={`absolute z-30 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl backdrop-blur-xl border shadow-xl text-xs font-bold transition-all duration-300 pointer-events-none ${c.position} ${c.accent}`}
              style={{
                transform: isHovered ? 'translateY(-6px) scale(1.05)' : 'translateY(0px)',
              }}
            >
              {c.icon}
              <span>{c.text}</span>
            </div>
          ))}

          {/* Main 3D Browser Showcase Window */}
          <div
            className="w-full bg-white dark:bg-[#11131b] rounded-3xl border-2 border-slate-200 dark:border-white/15 shadow-2xl shadow-emerald-950/20 overflow-hidden transition-all duration-500 ease-out"
            style={{
              transform: isHovered
                ? 'rotateX(2deg) translateY(-8px) scale(1.01)'
                : 'rotateX(6deg) translateY(0px)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Window Chrome Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-[#0c0e14] border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <div className="ml-4 hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-white dark:bg-white/8 border border-slate-200 dark:border-white/10 text-slate-400 text-xs font-mono">
                  <span>🔒 saveme-tau.vercel.app/dashboard</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Live Sync</span>
              </div>
            </div>

            {/* Dashboard Interface Simulation */}
            <div className="grid grid-cols-12 min-h-[440px] sm:min-h-[480px]">
              {/* Sidebar */}
              <div className="hidden sm:flex col-span-3 border-r border-slate-100 dark:border-white/8 bg-slate-50/40 dark:bg-[#0e1017] p-5 flex-col justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5 mb-6 px-1">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-xs shadow-md">
                      S
                    </div>
                    <span className="font-black text-slate-900 dark:text-white text-base">SaveMe</span>
                  </div>

                  {[
                    { name: 'Dashboard', active: true },
                    { name: 'Dompet & Kas', active: false },
                    { name: 'Transaksi', active: false },
                    { name: 'Jatah Harian', active: false },
                    { name: 'Celengan Impian', active: false },
                    { name: 'Smart Payroll', active: false },
                  ].map((menu, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        menu.active
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {menu.name}
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">Status Keuangan</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Arus Kas Sangat Sehat 🚀</p>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-12 sm:col-span-9 p-5 sm:p-7 flex flex-col gap-5 bg-white dark:bg-[#11131b]">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                    <p className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider">Total Kas Bebas</p>
                    <p className="text-xl font-black mt-1">Rp 4.280.000</p>
                    <p className="text-[10px] text-emerald-200 mt-2">Bebas overspending</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181c26] border border-slate-200 dark:border-white/10">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jatah Belanja Hari Ini</p>
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">Rp 142.000</p>
                    <p className="text-[10px] text-slate-400 mt-2">Sisa 30 hari gajian</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181c26] border border-slate-200 dark:border-white/10">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tabungan Terkunci</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">Rp 2.000.000</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2">100% Terproteksi</p>
                  </div>
                </div>

                {/* Live Activity & Graph Split */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  {/* Category Breakdown */}
                  <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#161a24] border border-slate-200 dark:border-white/8 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Alokasi Kas Bulanan</span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">50 / 30 / 20</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          <span>Kebutuhan Pokok</span>
                          <span>50%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div className="w-1/2 h-full bg-emerald-500 rounded-full" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          <span>Celengan Impian</span>
                          <span>30%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div className="w-[30%] h-full bg-teal-400 rounded-full" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          <span>Hiburan &amp; Keinginan</span>
                          <span>20%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div className="w-[20%] h-full bg-blue-500 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Feed */}
                  <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#161a24] border border-slate-200 dark:border-white/8">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mb-3">Transaksi Terbaru</span>
                    <div className="space-y-2.5">
                      {[
                        { icon: '🍔', title: 'Makan Siang Resto', sub: 'Kas Belanja', amount: '-Rp 45.000', neg: true },
                        { icon: '💼', title: 'Gaji Pokok', sub: 'Pemasukan', amount: '+Rp 8.500.000', neg: false },
                        { icon: '☕', title: 'Kopi Arabika', sub: 'Kas Belanja', amount: '-Rp 28.000', neg: true },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center text-xs">
                              {item.icon}
                            </span>
                            <div>
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-none">{item.title}</p>
                              <p className="text-[9px] text-slate-400">{item.sub}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-black ${item.neg ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {item.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Callout Summary */}
        <div className="mt-8 md:hidden grid grid-cols-1 gap-3">
          {CALLOUTS.map((c, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-bold ${c.accent}`}>
              {c.icon}
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
