'use client'

import React, { useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts'
import { PieChart as PieIcon, BarChart3, TrendingUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface CategoryChartItem {
  name: string
  icon: string
  amount: number
  percentage: number
}

export interface MonthlyChartItem {
  month: string
  income: number
  expense: number
  net: number
}

export interface DailyTrendItem {
  date: string
  label: string
  amount: number
}

interface ReportChartsProps {
  categoryData: CategoryChartItem[]
  monthlyComparisonData: MonthlyChartItem[]
  dailyTrendData: DailyTrendItem[]
  totalExpense: number
  totalIncome: number
  formatRupiah: (val: number) => string
}

type ChartTab = 'category' | 'monthly' | 'daily'

const CHART_COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // purple-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#a855f7', // violet-500
  '#84cc16', // lime-500
  '#e11d48', // rose-600
  '#0284c7', // sky-600
  '#d97706', // amber-600
  '#9333ea', // purple-600
  '#059669', // emerald-600
  '#ca8a04', // yellow-600
  '#4f46e5', // indigo-600
  '#db2777', // pink-600
  '#64748b', // slate-500
]

export const ReportCharts: React.FC<ReportChartsProps> = ({
  categoryData,
  monthlyComparisonData,
  dailyTrendData,
  totalExpense,
  totalIncome,
  formatRupiah,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('category')

  const topCategories = categoryData.slice(0, 8)

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl text-slate-900 dark:text-white">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#2d3348] mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
              Visualisasi Analitik Grafik
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pantau distribusi pengeluaran, perbandingan bulanan, dan pola harian
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#21263a] rounded-xl border border-slate-200 dark:border-[#2d3348] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('category')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
              activeTab === 'category'
                ? 'bg-white dark:bg-emerald-500 text-emerald-700 dark:text-slate-950 shadow-sm dark:shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Kategori</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
              activeTab === 'monthly'
                ? 'bg-white dark:bg-emerald-500 text-emerald-700 dark:text-slate-950 shadow-sm dark:shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>6 Bulan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
              activeTab === 'daily'
                ? 'bg-white dark:bg-emerald-500 text-emerald-700 dark:text-slate-950 shadow-sm dark:shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Tren Harian</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Donut Chart - Category Distribution */}
      {activeTab === 'category' && (
        <div className="animate-in fade-in duration-200">
          {topCategories.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada data pengeluaran untuk menampilkan diagram kategori.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Chart Visual */}
              <div className="lg:col-span-6 h-64 sm:h-72 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="amount"
                    >
                      {topCategories.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as CategoryChartItem
                          return (
                            <div className="p-3 rounded-xl bg-slate-900/95 dark:bg-[#131620]/95 backdrop-blur-md border border-slate-700 dark:border-[#2d3348] text-white shadow-2xl text-xs">
                              <div className="flex items-center gap-1.5 font-bold mb-1">
                                <span>{data.icon}</span>
                                <span>{data.name}</span>
                              </div>
                              <div className="font-mono text-emerald-400 font-bold">
                                {formatRupiah(data.amount)}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Proporsi: {data.percentage}% dari total pengeluaran
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Total Pengeluaran
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-red-600 dark:text-red-400 mt-0.5">
                    {formatRupiah(totalExpense)}
                  </span>
                </div>
              </div>

              {/* Legends & Top List */}
              <div className="lg:col-span-6 flex flex-col gap-2.5">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Distribusi Kategori Pengeluaran
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topCategories.map((item, idx) => {
                    const color = CHART_COLORS[idx % CHART_COLORS.length]
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#21263a]/60 border border-slate-200 dark:border-[#2d3348] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs truncate font-medium text-slate-800 dark:text-slate-200">
                            {item.icon} {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">
                            {item.percentage}%
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                            {formatRupiah(item.amount)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Grouped Bar Chart - 6 Months Income vs Expense */}
      {activeTab === 'monthly' && (
        <div className="animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Perbandingan Arus Kas Bulanan
            </span>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300">Pemasukan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span className="text-slate-600 dark:text-slate-300">Pengeluaran</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyComparisonData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.2}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155', opacity: 0.3 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`
                    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`
                    return `${val}`
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const inc = (payload.find((p) => p.dataKey === 'income')?.value as number) || 0
                      const exp = (payload.find((p) => p.dataKey === 'expense')?.value as number) || 0
                      const net = inc - exp
                      return (
                        <div className="p-3 rounded-xl bg-slate-900/95 dark:bg-[#131620]/95 backdrop-blur-md border border-slate-700 dark:border-[#2d3348] text-white shadow-2xl text-xs space-y-1">
                          <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1.5">
                            Bulan: {label}
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-emerald-400 font-medium">Pemasukan:</span>
                            <span className="font-mono font-bold">{formatRupiah(inc)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-rose-400 font-medium">Pengeluaran:</span>
                            <span className="font-mono font-bold">{formatRupiah(exp)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-slate-400">Surplus/Defisit:</span>
                            <span
                              className={cn(
                                'font-mono font-bold',
                                net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              )}
                            >
                              {net >= 0 ? '+' : ''}
                              {formatRupiah(net)}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: Area Line Chart - Daily Spending Trend */}
      {activeTab === 'daily' && (
        <div className="animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tren Pengeluaran Harian pada Periode Ini
            </span>
            <span className="text-xs font-mono text-slate-500">
              Rata-rata: {dailyTrendData.length > 0 ? formatRupiah(Math.round(totalExpense / dailyTrendData.length)) : 0}/hari
            </span>
          </div>

          {dailyTrendData.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Belum ada transaksi pengeluaran pada rentang waktu ini.
            </div>
          ) : (
            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyTrendData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    opacity={0.2}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={{ stroke: '#334155', opacity: 0.3 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`
                      if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`
                      return `${val}`
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as DailyTrendItem
                        return (
                          <div className="p-3 rounded-xl bg-slate-900/95 dark:bg-[#131620]/95 backdrop-blur-md border border-slate-700 dark:border-[#2d3348] text-white shadow-2xl text-xs">
                            <div className="text-slate-400 text-[11px] mb-1">
                              Tanggal: {item.date}
                            </div>
                            <div className="font-mono text-emerald-400 font-bold text-sm">
                              {formatRupiah(item.amount)}
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
