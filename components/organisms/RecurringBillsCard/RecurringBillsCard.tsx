'use client'

import React, { useState } from 'react'
import { recurringService, type CreateRecurringBillDto } from '@/lib/services/recurring.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { Badge } from '@/components/atoms/Badge'
import {
  CreditCard,
  PlusCircle,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Sparkles,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import type { RecurringBill, Category, Wallet } from '@/types'

export interface RecurringBillsCardProps {
  userId: string
  bills: RecurringBill[]
  categories: Category[]
  wallets?: Wallet[]
  onUpdated: () => void
}

export function RecurringBillsCard({
  userId,
  bills,
  categories,
  wallets = [],
  onUpdated,
}: RecurringBillsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [dueDay, setDueDay] = useState('10')
  const [autoDeduct, setAutoDeduct] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const now = new Date()
  const currentDay = now.getDate()
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`

  const totalMonthlyBills = bills.reduce((sum, b) => sum + b.amount, 0)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const numAmount = Number(amount)
    if (!name.trim()) {
      setFormError('Nama tagihan / cicilan wajib diisi')
      return
    }
    if (!numAmount || numAmount <= 0) {
      setFormError('Nominal tagihan harus lebih besar dari 0')
      return
    }

    const numDueDay = Number(dueDay)
    if (!numDueDay || numDueDay < 1 || numDueDay > 31) {
      setFormError('Tanggal jatuh tempo harus antara 1 sampai 31')
      return
    }

    const selectedCategory = categories.find((c) => c.id === categoryId) || {
      id: 'bills',
      name: 'Bills',
      icon: '📄',
      type: 'EXPENSE' as const,
    }

    setSubmitting(true)
    try {
      const payload: CreateRecurringBillDto = {
        name,
        amount: numAmount,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        dueDay: numDueDay,
        autoDeduct,
      }

      await recurringService.create(userId, payload)

      // Reset form
      setName('')
      setAmount('')
      setDueDay('10')
      setIsModalOpen(false)
      onUpdated()
    } catch (err: unknown) {
      console.error('[recurring] Error adding bill:', err)
      const errObj = err as { message?: string }
      setFormError(errObj.message || 'Gagal menyimpan tagihan')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Confirmation State
  const [billToDelete, setBillToDelete] = useState<string | null>(null)
  const [isDeletingBill, setIsDeletingBill] = useState(false)

  const handleConfirmDeleteBill = async () => {
    if (!billToDelete) return
    setIsDeletingBill(true)

    try {
      await recurringService.delete(userId, billToDelete)
      setBillToDelete(null)
      onUpdated()
    } catch (err) {
      console.error('[recurring] Error deleting bill:', err)
    } finally {
      setIsDeletingBill(false)
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-md dark:shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-[#2d3348]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pengeluaran Rutin &amp; Cicilan
                </h3>
                <Badge variant="brand" size="sm">
                  {bills.length} Tagihan
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Beban pasti bulanan yang otomatis terpotong saat jatuh tempo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                Total Beban Pasti:
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatRupiah(totalMonthlyBills)}/bln
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Tambah
            </Button>
          </div>
        </div>

        {/* List of Recurring Bills */}
        {bills.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="text-3xl mb-2">💳</div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Belum ada cicilan / pengeluaran rutin
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Daftarkan tagihan seperti Cicilan Motor, Wi-Fi, BPJS, atau Kos agar SaveMe dapat menghitung uang bebas belanjamu secara akurat.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              + Daftarkan Tagihan Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {bills.map((bill) => {
              const isPaidThisMonth = bill.lastProcessedMonth === currentMonthStr
              const daysDiff = bill.dueDay - currentDay
              const targetWallet =
                wallets.find((w) => w.id === bill.walletId) ||
                wallets.find((w) => !w.isLocked) ||
                wallets[0]
              const isOverdueInsufficient =
                !isPaidThisMonth &&
                currentDay >= bill.dueDay &&
                Boolean(targetWallet && Number(targetWallet.balance) < bill.amount)

              let statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <Clock className="w-3 h-3" />
                  {daysDiff === 0
                    ? 'Hari ini'
                    : daysDiff > 0
                    ? `${daysDiff} hari lagi`
                    : `Tiap tgl ${bill.dueDay}`}
                </span>
              )

              if (isPaidThisMonth) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Terpotong Bln Ini
                  </span>
                )
              } else if (isOverdueInsufficient) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                    <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" /> Saldo Kurang
                  </span>
                )
              }

              return (
                <div
                  key={bill.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#21263a]/50 hover:bg-slate-100 dark:hover:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] text-lg flex items-center justify-center shrink-0 shadow-sm">
                      {bill.categoryIcon || '📄'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {bill.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatRupiah(bill.amount)}
                        </span>
                        {statusBadge}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {bill.autoDeduct && (
                      <span
                        className="p-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400"
                        title="Auto-Deduct Aktif"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setBillToDelete(bill.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-[#1a1d27] transition-all cursor-pointer"
                      title="Hapus tagihan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Add Recurring Bill */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Daftarkan Cicilan / Tagihan Rutin
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBill} className="flex flex-col gap-4">
              <FormField label="Nama Tagihan / Cicilan" required>
                <Input
                  placeholder="Contoh: Cicilan Motor Honda Beat / Wi-Fi Indihome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Nominal Tagihan per Bulan (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 1200000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tanggal Jatuh Tempo" hint="Tanggal 1 s.d 31 setiap bulan" required>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Kategori">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-white dark:bg-[#21263a] text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-sm border border-slate-200 dark:border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {/* Auto Deduct Switch */}
              <label className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    Auto-Deduct (Potong Otomatis)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Otomatis catat transaksi pengeluaran saat tanggal jatuh tempo tiba di bulan berjalan.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoDeduct}
                  onChange={(e) => setAutoDeduct(e.target.checked)}
                  className="w-4 h-4 accent-green-500 rounded cursor-pointer"
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2d3348] mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  loading={submitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Simpan Tagihan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Bill */}
      <ConfirmModal
        isOpen={Boolean(billToDelete)}
        title="Hapus Tagihan Rutin?"
        description="Apakah Anda yakin ingin menghapus tagihan rutin ini? Pengeluaran tidak akan lagi terpotong otomatis."
        confirmText="Hapus Tagihan"
        cancelText="Batal"
        variant="danger"
        loading={isDeletingBill}
        onConfirm={handleConfirmDeleteBill}
        onClose={() => setBillToDelete(null)}
      />
    </div>
  )
}
