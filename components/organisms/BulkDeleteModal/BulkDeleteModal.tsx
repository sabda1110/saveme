'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { transactionService, type BulkDeleteResult } from '@/lib/services/transaction.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import {
  Trash2,
  X,
  AlertTriangle,
  Calendar,
  Wallet as WalletIcon,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import type { Transaction, Wallet } from '@/types'
import { cn } from '@/lib/utils/cn'

interface BulkDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: BulkDeleteResult) => void
  transactions: Transaction[]
  wallets: Wallet[]
  formatRupiah: (val: number) => string
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  transactions,
  wallets,
  formatRupiah,
}: BulkDeleteModalProps) {
  const { user } = useAuth()

  // Mode: Rentang Tanggal vs Hapus Semua
  const [mode, setMode] = useState<'RANGE' | 'ALL'>('RANGE')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL')

  // Date Range State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const firstDayOfMonthStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }, [])

  const [startDate, setStartDate] = useState(firstDayOfMonthStr)
  const [endDate, setEndDate] = useState(todayStr)

  // Wallet Action: KEEP (Pertahankan Saldo) vs RESET_CUSTOM (Atur Ulang Saldo)
  const [walletAction, setWalletAction] = useState<'KEEP' | 'RESET_CUSTOM'>('KEEP')
  const [customBalances, setCustomBalances] = useState<Record<string, string>>({})

  // Initialize custom balances from wallets
  useEffect(() => {
    if (wallets.length > 0) {
      const initial: Record<string, string> = {}
      wallets.forEach((w) => {
        initial[w.id] = String(w.balance || 0)
      })
      setCustomBalances(initial)
    }
  }, [wallets, isOpen])

  // Sync Modules Toggle
  const [syncOtherModules, setSyncOtherModules] = useState(true)

  // Safety Confirmation Input
  const [confirmKeyword, setConfirmKeyword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Preset Date Range Helpers
  const applyPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS' | 'LAST_30_DAYS') => {
    const now = new Date()
    if (preset === 'THIS_MONTH') {
      setStartDate(firstDayOfMonthStr)
      setEndDate(todayStr)
    } else if (preset === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split('T')[0]
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split('T')[0]
      setStartDate(firstDayLastMonth)
      setEndDate(lastDayLastMonth)
    } else if (preset === 'LAST_7_DAYS') {
      const past7 = new Date()
      past7.setDate(past7.getDate() - 7)
      setStartDate(past7.toISOString().split('T')[0])
      setEndDate(todayStr)
    } else if (preset === 'LAST_30_DAYS') {
      const past30 = new Date()
      past30.setDate(past30.getDate() - 30)
      setStartDate(past30.toISOString().split('T')[0])
      setEndDate(todayStr)
    }
  }

  // Live Target Transactions Calculation
  const targetTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false
      if (mode === 'RANGE') {
        if (startDate && t.transactionDate < startDate) return false
        if (endDate && t.transactionDate > endDate) return false
      }
      return true
    })
  }, [transactions, mode, typeFilter, startDate, endDate])

  const targetMetrics = useMemo(() => {
    let income = 0
    let expense = 0
    targetTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0
      if (t.type === 'INCOME') income += amt
      if (t.type === 'EXPENSE') expense += amt
    })
    return {
      count: targetTransactions.length,
      income,
      expense,
    }
  }, [targetTransactions])

  const isConfirmed = confirmKeyword.trim().toUpperCase() === 'HAPUS'
  const canSubmit = isConfirmed && targetMetrics.count > 0 && !submitting

  // Handle Submission
  const handleExecute = async () => {
    if (!user?.uid || !canSubmit) return

    setErrorMsg(null)
    setSubmitting(true)

    try {
      const customWalletBalances: Record<string, number> = {}
      if (walletAction === 'RESET_CUSTOM') {
        wallets.forEach((w) => {
          const val = Number(customBalances[w.id])
          customWalletBalances[w.id] = isNaN(val) ? 0 : Math.max(0, val)
        })
      }

      const result = await transactionService.bulkDelete(user.uid, {
        mode,
        typeFilter,
        startDate: mode === 'RANGE' ? startDate : undefined,
        endDate: mode === 'RANGE' ? endDate : undefined,
        walletAction,
        customWalletBalances: walletAction === 'RESET_CUSTOM' ? customWalletBalances : undefined,
        syncOtherModules,
      })

      onSuccess(result)
      onClose()
    } catch (err) {
      console.error('[BulkDeleteModal] Execution error:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header (Sticky) */}
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Pembersihan &amp; Hapus Transaksi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bersihkan catatan transaksi lama untuk memulai lembaran baru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Scope & Filter Selection */}
          <div className="space-y-3">
            <label className="font-bold text-slate-900 dark:text-white text-xs block">
              1. Pilih Lingkup Transaksi yang Ingin Dihapus
            </label>

            {/* Mode Segmented Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/6">
              <button
                type="button"
                onClick={() => setMode('RANGE')}
                className={cn(
                  'py-2 px-3 rounded-xl font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5',
                  mode === 'RANGE'
                    ? 'bg-white dark:bg-[#141824] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                )}
              >
                <Calendar className="w-4 h-4" />
                <span>Rentang Tanggal</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('ALL')}
                className={cn(
                  'py-2 px-3 rounded-xl font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5',
                  mode === 'ALL'
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 shadow-xs border border-rose-200/50 dark:border-rose-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                )}
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Hapus Semua (Reset Total)</span>
              </button>
            </div>

            {/* Date Range Inputs (Only shown if mode === 'RANGE') */}
            {mode === 'RANGE' && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200/60 dark:border-white/6 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Dari Tanggal:
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Sampai Tanggal:
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400">Preset cepat:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('THIS_MONTH')}
                    className="px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('LAST_MONTH')}
                    className="px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    Bulan Lalu
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('LAST_7_DAYS')}
                    className="px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    7 Hari Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('LAST_30_DAYS')}
                    className="px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    30 Hari Terakhir
                  </button>
                </div>
              </div>
            )}

            {/* Type Filter (All vs Expense vs Income) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200/60 dark:border-white/6 flex-wrap gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">
                Jenis Transaksi yang Dihapus:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    typeFilter === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('EXPENSE')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    typeFilter === 'EXPENSE'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-rose-500'
                  )}
                  title="Hanya hapus pengeluaran (pemasukan tetap aman)"
                >
                  Hanya Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('INCOME')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    typeFilter === 'INCOME'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-emerald-500'
                  )}
                >
                  Hanya Pemasukan
                </button>
              </div>
            </div>
          </div>

          {/* 2. Live Impact Preview Card */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Simulasi Dampak Transaksi yang Akan Dihapus:</span>
              </span>
              <span className="text-xs font-mono font-black text-amber-800 dark:text-amber-300">
                {targetMetrics.count} Transaksi
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#141824] border border-amber-200/50 dark:border-amber-500/10">
                <span className="text-[10px] text-slate-500 block">Total Pengeluaran:</span>
                <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                  {formatRupiah(targetMetrics.expense)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#141824] border border-amber-200/50 dark:border-amber-500/10">
                <span className="text-[10px] text-slate-500 block">Total Pemasukan:</span>
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(targetMetrics.income)}
                </span>
              </div>
            </div>

            {targetMetrics.count === 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 italic text-center pt-1">
                Tidak ada transaksi yang cocok dengan kriteria filter di atas.
              </p>
            )}
          </div>

          {/* 3. Wallet Balance Handling (User's Core Requirement) */}
          <div className="space-y-3">
            <label className="font-bold text-slate-900 dark:text-white text-xs block">
              2. Pilihan Penanganan Saldo Kantong / Dompet
            </label>

            <div className="space-y-2">
              {/* Option 1: KEEP */}
              <label
                className={cn(
                  'p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all',
                  walletAction === 'KEEP'
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 dark:border-blue-500/30'
                    : 'bg-slate-50 dark:bg-[#0e1118] border-slate-200/60 dark:border-white/6 hover:border-slate-300'
                )}
              >
                <input
                  type="radio"
                  name="walletAction"
                  value="KEEP"
                  checked={walletAction === 'KEEP'}
                  onChange={() => setWalletAction('KEEP')}
                  className="mt-0.5 accent-blue-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Pertahankan Saldo Dompet Saat Ini</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Paling Aman &amp; Direkomendasikan
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hanya riwayat catatan transaksi yang dibersihkan. Saldo seluruh kantong/rekening Anda <strong>TIDAK DIUBAH</strong> (tidak terpotong dan tidak bertambah). Sangat cocok jika saldo fisik dompet/rekening saat ini sudah sesuai dan Anda hanya ingin menghapus jejak catatan yang kemarin asal-asalan.
                  </p>
                </div>
              </label>

              {/* Option 2: RESET_CUSTOM */}
              <label
                className={cn(
                  'p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all',
                  walletAction === 'RESET_CUSTOM'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 dark:border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-[#0e1118] border-slate-200/60 dark:border-white/6 hover:border-slate-300'
                )}
              >
                <input
                  type="radio"
                  name="walletAction"
                  value="RESET_CUSTOM"
                  checked={walletAction === 'RESET_CUSTOM'}
                  onChange={() => setWalletAction('RESET_CUSTOM')}
                  className="mt-0.5 accent-emerald-500 cursor-pointer"
                />
                <div className="space-y-0.5 flex-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Atur Ulang / Reset Saldo Kantong Sekaligus</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Fresh Start
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tentukan saldo baru untuk masing-masing kantong Anda saat ini agar langsung sinkron dengan uang riil Anda dari awal.
                  </p>

                  {/* Form input kantong (Only visible when RESET_CUSTOM is active) */}
                  {walletAction === 'RESET_CUSTOM' && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Masukkan Saldo Baru Tiap Kantong:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const zeroed: Record<string, string> = {}
                            wallets.forEach((w) => {
                              zeroed[w.id] = '0'
                            })
                            setCustomBalances(zeroed)
                          }}
                          className="text-[10px] text-rose-500 hover:underline font-bold"
                        >
                          Set Semua Jadi Rp 0
                        </button>
                      </div>

                      {wallets.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-[#141824] border border-slate-200/60 dark:border-white/6"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{w.icon || '💳'}</span>
                            <div className="truncate">
                              <span className="font-bold text-slate-900 dark:text-white block truncate">
                                {w.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Saldo lama: {formatRupiah(w.balance || 0)}
                              </span>
                            </div>
                          </div>

                          <div className="w-36 shrink-0">
                            <Input
                              type="number"
                              min="0"
                              value={customBalances[w.id] || ''}
                              onChange={(e) =>
                                setCustomBalances((prev) => ({
                                  ...prev,
                                  [w.id]: e.target.value,
                                }))
                              }
                              placeholder="0"
                              className="text-right text-xs h-8 font-mono font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* 4. Other Modules Synchronization Checkbox */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200/60 dark:border-white/6 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-xs">
                  Sinkronkan Modul Lain Otomatis
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Menyesuaikan status cicilan, tabungan celengan, dan alokasi gaji
                </span>
              </div>
              <input
                type="checkbox"
                checked={syncOtherModules}
                onChange={(e) => setSyncOtherModules(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {syncOtherModules && (
              <ul className="text-[10px] text-slate-500 dark:text-slate-400 list-disc list-inside space-y-1 pt-1 border-t border-slate-200/50 dark:border-white/6">
                <li>Cicilan/tagihan yang transaksinya terhapus dikembalikan ke status <strong>Belum Bayar</strong>.</li>
                <li>Saldo Celengan Impian disesuaikan jika ada transaksi setor/tarik yang terhapus.</li>
                <li>Bulan alokasi gaji direset jika pemasukan gaji pada periode tersebut terhapus.</li>
              </ul>
            )}
          </div>

          {/* 5. Safety Confirmation Box */}
          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Konfirmasi Keamanan (Tindakan Tidak Dapat Dibatalkan)</span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-300 leading-relaxed">
              Seluruh transaksi yang terpilih ({targetMetrics.count} transaksi) akan dihapus secara permanen dari basis data SaveMe.
            </p>
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Ketik kata <span className="text-rose-600 font-black">&quot;HAPUS&quot;</span> untuk melanjutkan:
              </label>
              <Input
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder='Ketik "HAPUS" di sini...'
                className="font-bold text-center uppercase tracking-widest text-xs h-9 border-rose-300 dark:border-rose-500/30 focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Footer (Sticky) */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#141824] shrink-0 text-xs flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>

          <Button
            variant="danger"
            size="sm"
            type="button"
            disabled={!canSubmit}
            loading={submitting}
            onClick={handleExecute}
            className="px-4 text-xs font-bold"
          >
            Hapus {targetMetrics.count} Transaksi Sekarang
          </Button>
        </div>
      </div>
    </div>
  )
}
