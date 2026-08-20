'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { recurringService, type CreateRecurringBillDto } from '@/lib/services/recurring.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { transactionService } from '@/lib/services/transaction.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import {
  CreditCard,
  PlusCircle,
  Pencil,
  Trash2,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react'
import type { RecurringBill, Category } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function BillsPage() {
  const { user } = useAuth()

  const [bills, setBills] = useState<RecurringBill[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL')

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formDueDay, setFormDueDay] = useState('10')
  const [formAutoDeduct, setFormAutoDeduct] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const now = new Date()
  const currentDay = now.getDate()
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [billsData, cats] = await Promise.all([
          recurringService.getUserRecurringBills(user.uid),
          categoryService.getCategories(),
        ])

        if (isMounted) {
          setBills(billsData)
          setCategories(cats)
          if (cats.length > 0 && !formCategoryId) {
            setFormCategoryId(cats[0].id)
          }
        }
      } catch (error) {
        console.error('[bills] Error loading data:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [user?.uid, refreshTrigger, formCategoryId])

  const totalMonthly = useMemo(
    () => bills.reduce((sum, b) => sum + b.amount, 0),
    [bills]
  )
  const totalAnnual = totalMonthly * 12

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const isPaid = b.lastProcessedMonth === currentMonthStr
      if (statusFilter === 'PAID') return isPaid
      if (statusFilter === 'UNPAID') return !isPaid
      return true
    })
  }, [bills, statusFilter, currentMonthStr])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleOpenEdit = (bill: RecurringBill) => {
    setEditingBill(bill)
    setFormName(bill.name)
    setFormAmount(bill.amount.toString())
    setFormCategoryId(bill.categoryId)
    setFormDueDay(bill.dueDay.toString())
    setFormAutoDeduct(bill.autoDeduct)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const numAmount = Number(formAmount)
    const numDueDay = Number(formDueDay)

    if (!formName.trim()) {
      setFormError('Nama tagihan / cicilan wajib diisi')
      return
    }
    if (!numAmount || numAmount <= 0) {
      setFormError('Nominal tagihan harus lebih besar dari 0')
      return
    }
    if (!numDueDay || numDueDay < 1 || numDueDay > 31) {
      setFormError('Tanggal jatuh tempo harus antara 1 sampai 31')
      return
    }

    const selectedCategory = categories.find((c) => c.id === formCategoryId) || {
      id: 'bills',
      name: 'Bills',
      icon: '📄',
      type: 'EXPENSE' as const,
    }

    if (!user?.uid) return

    setSubmitting(true)
    try {
      if (editingBill) {
        // UPDATE
        await recurringService.update(user.uid, editingBill.id, {
          name: formName,
          amount: numAmount,
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          categoryIcon: selectedCategory.icon,
          dueDay: numDueDay,
          autoDeduct: formAutoDeduct,
        })
      } else {
        // CREATE
        const payload: CreateRecurringBillDto = {
          name: formName,
          amount: numAmount,
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          categoryIcon: selectedCategory.icon,
          dueDay: numDueDay,
          autoDeduct: formAutoDeduct,
        }
        await recurringService.create(user.uid, payload)
      }

      setIsModalOpen(false)
      setEditingBill(null)
      setFormName('')
      setFormAmount('')
      setFormDueDay('10')
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[bills] Error saving bill:', err)
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
    if (!user?.uid || !billToDelete) return
    setIsDeletingBill(true)

    try {
      await recurringService.delete(user.uid, billToDelete)
      setBillToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[bills] Error deleting bill:', err)
    } finally {
      setIsDeletingBill(false)
    }
  }

  // Pay Confirmation State
  const [billToPay, setBillToPay] = useState<RecurringBill | null>(null)
  const [isPayingBill, setIsPayingBill] = useState(false)

  const handleConfirmPayBill = async () => {
    if (!user?.uid || !billToPay) return
    setIsPayingBill(true)

    try {
      const todayStr = new Date().toISOString().split('T')[0]
      await transactionService.create(user.uid, {
        type: 'EXPENSE',
        amount: billToPay.amount,
        categoryId: billToPay.categoryId,
        categoryName: billToPay.categoryName,
        categoryIcon: billToPay.categoryIcon,
        description: `[Pembayaran Tagihan] ${billToPay.name}`,
        transactionDate: todayStr,
      })

      await recurringService.update(user.uid, billToPay.id, {
        lastProcessedMonth: currentMonthStr,
      })

      setBillToPay(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[bills] Error processing payment:', err)
    } finally {
      setIsPayingBill(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Cicilan & Pengeluaran Rutin
              </h1>
              <p className="text-xs text-slate-400">
                Pantau seluruh tagihan tetap, cicilan, dan langganan bulanan tanpa terlewat
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            title="Muat ulang data"
            className="text-xs px-2.5 sm:px-3"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => {
              setEditingBill(null)
              setFormName('')
              setFormAmount('')
              setFormDueDay('10')
              setFormAutoDeduct(true)
              setIsModalOpen(true)
            }}
            className="text-xs sm:text-sm px-3 sm:px-4 ml-auto sm:ml-0"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Daftarkan Tagihan
          </Button>
        </div>
      </div>

      {/* 2 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Total Beban Pasti per Bulan
            </span>
            <div className="text-xl sm:text-3xl font-extrabold font-mono text-purple-400 tabular-nums">
              {formatRupiah(totalMonthly)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Akumulasi {bills.length} pos tagihan aktif
            </span>
          </div>
          <Badge variant="brand" size="md">
            Bulanan
          </Badge>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Estimasi Komitmen per Tahun
            </span>
            <div className="text-xl sm:text-3xl font-extrabold font-mono text-amber-300 tabular-nums">
              {formatRupiah(totalAnnual)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              12 bulan pengeluaran rutin
            </span>
          </div>
          <Badge variant="warning" size="md">
            Tahunan
          </Badge>
        </div>
      </div>

      {/* Filter Tabs (Horizontal Scrollable) */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] overflow-x-auto max-w-full no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              statusFilter === 'ALL'
                ? 'bg-purple-500 text-white font-bold shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Semua Tagihan ({bills.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UNPAID')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              statusFilter === 'UNPAID'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Belum Terbayar Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PAID')}
            className={cn(
              'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              statusFilter === 'PAID'
                ? 'bg-green-500 text-slate-950 font-bold shadow-lg shadow-green-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Sudah Terbayar Bulan Ini
          </button>
        </div>
      </div>

      {/* Bills Grid / Cards */}
      {filteredBills.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-3">💳</div>
          <h4 className="text-base font-bold text-white mb-1">
            Tidak ada data tagihan pada filter ini
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Klik tombol di bawah untuk mendaftarkan cicilan atau tagihan bulanan baru.
          </p>
          <Button
            variant="glow"
            size="sm"
            onClick={() => {
              setEditingBill(null)
              setIsModalOpen(true)
            }}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Daftarkan Tagihan Baru
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBills.map((bill) => {
            const isPaid = bill.lastProcessedMonth === currentMonthStr
            const daysDiff = bill.dueDay - currentDay

            return (
              <div
                key={bill.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex flex-col justify-between shadow-xl transition-all group hover:border-purple-500/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#21263a] border border-[#2d3348] text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-inner">
                        {bill.categoryIcon || '📄'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-white truncate">
                          {bill.name}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {bill.categoryName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(bill)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#21263a] transition-colors cursor-pointer"
                        title="Edit tagihan"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillToDelete(bill.id)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#21263a] transition-colors cursor-pointer"
                        title="Hapus tagihan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#21263a]/60 border border-[#2d3348] mb-3 sm:mb-4">
                    <span className="text-xs text-slate-400">Nominal per Bulan:</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-purple-300">
                      {formatRupiah(bill.amount)}
                    </span>
                  </div>

                  {/* Due date & Auto-deduct pills */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-300 bg-[#21263a] px-2.5 py-1 rounded-xl border border-[#2d3348]">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Jatuh tempo tiap tgl <strong>{bill.dueDay}</strong></span>
                    </span>

                    {bill.autoDeduct ? (
                      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-xl border border-green-500/20">
                        <Zap className="w-3.5 h-3.5" /> Auto-Deduct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 bg-[#21263a] px-2.5 py-1 rounded-xl border border-[#2d3348]">
                        Manual
                      </span>
                    )}
                  </div>
                </div>

                {/* Status & Quick Pay Footer */}
                <div className="pt-3 border-t border-[#2d3348] flex items-center justify-between gap-2">
                  {isPaid ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lunas untuk bulan ini</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-[11px] sm:text-xs text-amber-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {daysDiff === 0
                          ? 'Hari ini!'
                          : daysDiff > 0
                          ? `${daysDiff} hari lagi`
                          : 'Lewat tanggal'}
                      </span>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs px-2.5 sm:px-3"
                        onClick={() => setBillToPay(bill)}
                      >
                        Bayar Sekarang
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Bill */}
      <ConfirmModal
        isOpen={Boolean(billToDelete)}
        title="Hapus Tagihan Rutin?"
        description="Apakah Anda yakin ingin menghapus tagihan rutin ini dari daftar kewajiban bulanan?"
        confirmText="Hapus Tagihan"
        cancelText="Batal"
        variant="danger"
        loading={isDeletingBill}
        onConfirm={handleConfirmDeleteBill}
        onClose={() => setBillToDelete(null)}
      />

      {/* Custom Confirmation Modal for Paying Bill */}
      <ConfirmModal
        isOpen={Boolean(billToPay)}
        title="Bayar & Catat Pengeluaran?"
        description={
          billToPay
            ? `Tandai "${billToPay.name}" (${formatRupiah(billToPay.amount)}) sebagai lunas dan catat transaksi pengeluaran hari ini?`
            : ''
        }
        confirmText="Ya, Lunaskan"
        cancelText="Batal"
        variant="warning"
        loading={isPayingBill}
        onConfirm={handleConfirmPayBill}
        onClose={() => setBillToPay(null)}
      />

      {/* Modal Add / Edit Recurring Bill (Responsive bottom-sheet style on mobile) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1d27] border border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {editingBill ? 'Edit Data Tagihan' : 'Daftarkan Cicilan / Tagihan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingBill(null)
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#21263a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="flex flex-col gap-3.5 sm:gap-4">
              <FormField label="Nama Tagihan / Cicilan" required>
                <Input
                  placeholder="Contoh: Cicilan Motor Honda Beat / Wi-Fi Indihome"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Nominal Tagihan per Bulan (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 1200000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <FormField label="Tanggal Jatuh Tempo" hint="Tanggal 1 s.d 31 setiap bulan" required>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={formDueDay}
                    onChange={(e) => setFormDueDay(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Kategori">
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-[#21263a] text-slate-100 rounded-xl px-4 py-3 text-sm border border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
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
              <label className="p-3.5 rounded-xl bg-[#21263a] border border-[#2d3348] flex items-center justify-between cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-green-400" />
                    Auto-Deduct (Potong Otomatis)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Otomatis catat transaksi pengeluaran saat tanggal jatuh tempo tiba di bulan berjalan.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formAutoDeduct}
                  onChange={(e) => setFormAutoDeduct(e.target.checked)}
                  className="w-4 h-4 accent-green-500 rounded cursor-pointer"
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d3348] mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingBill(null)
                  }}
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
                  {editingBill ? 'Simpan Perubahan' : 'Simpan Tagihan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
