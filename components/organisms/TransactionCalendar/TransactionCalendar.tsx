'use client'

import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  PlusCircle,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import type { Transaction, Wallet } from '@/types'
import { cn } from '@/lib/utils/cn'

interface TransactionCalendarProps {
  transactions: Transaction[]
  wallets: Wallet[]
  formatRupiah: (val: number) => string
  onEdit: (tx: Transaction) => void
  onDelete: (txId: string) => void
  onAddOnDate: (dateStr: string) => void
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export const TransactionCalendar: React.FC<TransactionCalendarProps> = ({
  transactions,
  wallets,
  formatRupiah,
  onEdit,
  onDelete,
  onAddOnDate,
}) => {
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today])

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(todayStr)
  }

  // Days in month calculation
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const startingDayIndex = firstDay.getDay() // 0 for Sunday, 1 for Monday...
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()

    const cells: {
      dayNumber: number | null
      dateStr: string | null
      isToday: boolean
      isCurrentMonth: boolean
    }[] = []

    // Empty cells before start of month
    for (let i = 0; i < startingDayIndex; i++) {
      cells.push({
        dayNumber: null,
        dateStr: null,
        isToday: false,
        isCurrentMonth: false,
      })
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const monthFormatted = String(currentMonth + 1).padStart(2, '0')
      const dayFormatted = String(d).padStart(2, '0')
      const dateStr = `${currentYear}-${monthFormatted}-${dayFormatted}`
      cells.push({
        dayNumber: d,
        dateStr,
        isToday: dateStr === todayStr,
        isCurrentMonth: true,
      })
    }

    return cells
  }, [currentYear, currentMonth, todayStr])

  // Transactions mapped by date (YYYY-MM-DD)
  const txByDateMap = useMemo(() => {
    const map: Record<
      string,
      {
        income: number
        expense: number
        items: Transaction[]
      }
    > = {}

    transactions.forEach((tx) => {
      const d = tx.transactionDate
      if (!map[d]) {
        map[d] = { income: 0, expense: 0, items: [] }
      }
      if (tx.type === 'INCOME') {
        map[d].income += tx.amount
      } else {
        map[d].expense += tx.amount
      }
      map[d].items.push(tx)
    })

    return map
  }, [transactions])

  // Monthly summary for the viewed month
  const viewedMonthSummary = useMemo(() => {
    let income = 0
    let expense = 0
    let txCount = 0

    transactions.forEach((tx) => {
      const [y, m] = tx.transactionDate.split('-').map(Number)
      if (y === currentYear && m === currentMonth + 1) {
        if (tx.type === 'INCOME') income += tx.amount
        else expense += tx.amount
        txCount++
      }
    })

    return {
      income,
      expense,
      net: income - expense,
      txCount,
    }
  }, [transactions, currentYear, currentMonth])

  // Selected date transactions
  const selectedDateData = selectedDate ? txByDateMap[selectedDate] : null
  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null
    const [y, m, d] = selectedDate.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [selectedDate])

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateObj) return ''
    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][
      selectedDateObj.getDay()
    ]
    return `${dayName}, ${selectedDateObj.getDate()} ${
      MONTH_NAMES[selectedDateObj.getMonth()]
    } ${selectedDateObj.getFullYear()}`
  }, [selectedDateObj])

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar Header & Month Navigation */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {viewedMonthSummary.txCount} transaksi tercatat pada bulan ini
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleJumpToToday}
            className="text-xs font-bold px-3"
          >
            Hari Ini
          </Button>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#21263a] p-1 rounded-xl border border-slate-200 dark:border-[#2d3348]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Pemasukan Bulan Ini
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-green-600 dark:text-green-400">
              +{formatRupiah(viewedMonthSummary.income)}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Pengeluaran Bulan Ini
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-red-600 dark:text-red-400">
              -{formatRupiah(viewedMonthSummary.expense)}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Selisih Bersih Bulan Ini
            </span>
            <span
              className={cn(
                'text-sm sm:text-base font-bold font-mono',
                viewedMonthSummary.net >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {viewedMonthSummary.net >= 0 ? '+' : ''}
              {formatRupiah(viewedMonthSummary.net)}
            </span>
          </div>
          <Badge variant={viewedMonthSummary.net >= 0 ? 'brand' : 'expense'} size="sm">
            {viewedMonthSummary.net >= 0 ? 'Surplus' : 'Defisit'}
          </Badge>
        </div>
      </div>

      {/* Main Grid: Calendar (Left/Top) + Selected Date Details (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 7-Day Calendar Grid */}
        <div className="lg:col-span-8 p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'text-[11px] sm:text-xs font-bold py-1.5 uppercase tracking-wider',
                  i === 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((cell, idx) => {
              if (!cell.isCurrentMonth || !cell.dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[60px] sm:min-h-[84px] rounded-2xl bg-slate-50/50 dark:bg-[#131620]/30 border border-dashed border-slate-200 dark:border-[#242938]"
                  />
                )
              }

              const data = txByDateMap[cell.dateStr]
              const isSelected = selectedDate === cell.dateStr
              const hasExpense = data && data.expense > 0
              const hasIncome = data && data.income > 0

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr!)}
                  className={cn(
                    'min-h-[60px] sm:min-h-[84px] p-1.5 sm:p-2 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer relative group',
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : cell.isToday
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 dark:border-blue-500/40'
                      : 'bg-slate-50 dark:bg-[#21263a]/60 border-slate-200/80 dark:border-[#2d3348] hover:bg-slate-100 dark:hover:bg-[#252b42]'
                  )}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        'text-xs sm:text-sm font-black w-6 h-6 rounded-full flex items-center justify-center font-mono',
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : cell.isToday
                          ? 'bg-blue-500 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Status Dot */}
                    <div className="flex items-center gap-0.5">
                      {hasIncome && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                    </div>
                  </div>

                  {/* Expense/Income snippet (visible on larger screens) */}
                  <div className="mt-1 flex flex-col gap-0.5 min-w-0 overflow-hidden">
                    {hasExpense && (
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 truncate">
                        -{formatRupiah(data.expense).replace(',00', '')}
                      </span>
                    )}
                    {hasIncome && (
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-green-600 dark:text-green-400 truncate">
                        +{formatRupiah(data.income).replace(',00', '')}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Date Details Panel (Right side) */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-sm dark:shadow-xl flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                  Rincian Transaksi
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {formattedSelectedDate}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddOnDate(selectedDate)}
                title="Catat Transaksi Pada Tanggal Ini"
                className="text-xs p-2 text-emerald-600 dark:text-emerald-400"
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Tambah
              </Button>
            </div>

            {/* Daily Totals on Selected Date */}
            {selectedDateData && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2.5 rounded-xl bg-green-50/60 dark:bg-green-950/20 border border-green-500/20">
                  <span className="text-[10px] font-bold text-green-700 dark:text-green-400 block">
                    Pemasukan:
                  </span>
                  <span className="text-xs font-mono font-bold text-green-700 dark:text-green-400">
                    +{formatRupiah(selectedDateData.income)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-500/20">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block">
                    Pengeluaran:
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">
                    -{formatRupiah(selectedDateData.expense)}
                  </span>
                </div>
              </div>
            )}

            {/* List of items on this date */}
            {!selectedDateData || selectedDateData.items.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="text-3xl mb-2">🍃</div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tidak ada transaksi
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[200px] mt-0.5">
                  Belum ada catatan pemasukan atau pengeluaran di tanggal ini.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onAddOnDate(selectedDate)}
                  className="mt-4 text-xs"
                  leftIcon={<PlusCircle className="w-3.5 h-3.5 text-emerald-500" />}
                >
                  Catat Transaksi Baru
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                {selectedDateData.items.map((tx) => {
                  const isIncome = tx.type === 'INCOME'
                  const walletObj = wallets.find((w) => w.id === tx.walletId)

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#21263a]/70 border border-slate-200 dark:border-[#2d3348] flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex items-center justify-center text-sm shrink-0">
                          {tx.categoryIcon || '📦'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {tx.description || tx.categoryName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{tx.categoryName}</span>
                            {walletObj && (
                              <>
                                <span>•</span>
                                <span>{walletObj.icon} {walletObj.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={cn(
                              'text-xs font-mono font-bold block',
                              isIncome
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {isIncome ? '+' : '-'}
                            {formatRupiah(tx.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(tx.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
