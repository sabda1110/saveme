'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { transactionService, type CreateTransactionDto } from '@/lib/services/transaction.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { ReceiptScannerModal } from '@/components/organisms/ReceiptScannerModal'
import {
  ReceiptText,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Filter,
  Camera,
} from 'lucide-react'
import type { Category, Transaction, TransactionType, Wallet, ReceiptScanResult } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function TransactionsPage() {
  const { user } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Create / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formType, setFormType] = useState<TransactionType>('EXPENSE')
  const [formAmount, setFormAmount] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formWalletId, setFormWalletId] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [txs, cats, userWallets] = await Promise.all([
          transactionService.getUserTransactions(user.uid),
          categoryService.getCategories(),
          walletService.getUserWallets(user.uid),
        ])

        if (isMounted) {
          setTransactions(txs)
          setCategories(cats)
          setWallets(userWallets)
          if (cats.length > 0 && !formCategoryId) {
            setFormCategoryId(cats[0].id)
          }
          if (userWallets.length > 0 && !formWalletId) {
            setFormWalletId(userWallets[0].id)
          }
        }
      } catch (error) {
        console.error('[transactions] Error loading data:', error)
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
  }, [user?.uid, refreshTrigger, formCategoryId, formWalletId])

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchesDesc = tx.description?.toLowerCase().includes(q)
          const matchesCat = tx.categoryName.toLowerCase().includes(q)
          if (!matchesDesc && !matchesCat) return false
        }
        // Type filter
        if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
          return false
        }
        // Category filter
        if (categoryFilter !== 'ALL' && tx.categoryId !== categoryFilter) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.transactionDate.localeCompare(b.transactionDate)
        }
        return b.transactionDate.localeCompare(a.transactionDate)
      })
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortOrder])

  // Summary Metrics of filtered results
  const filteredIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  )

  const filteredExpense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  )

  const filteredNet = filteredIncome - filteredExpense

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Open Edit Modal
  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setFormType(tx.type)
    setFormAmount(tx.amount.toString())
    setFormCategoryId(tx.categoryId)
    setFormWalletId(tx.walletId || wallets[0]?.id || '')
    setFormDescription(tx.description || '')
    setFormDate(tx.transactionDate)
    setFormError(null)
    setIsAddModalOpen(true)
  }

  // Handle Apply Scan Result from AI Scanner
  const handleApplyScanResult = (result: ReceiptScanResult) => {
    setEditingTx(null)
    setFormType('EXPENSE')
    setFormAmount(result.totalAmount.toString())
    setFormDescription(result.merchantName)
    setFormDate(result.transactionDate)
    
    // Auto-match category
    const matchedCategory = categories.find(
      (c) =>
        c.id.toLowerCase() === result.suggestedCategoryId.toLowerCase() ||
        c.name.toLowerCase().includes(result.suggestedCategoryName.toLowerCase())
    )
    if (matchedCategory) {
      setFormCategoryId(matchedCategory.id)
    }

    setFormError(null)
    setIsAddModalOpen(true)
  }

  // Submit Add or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const numAmount = Number(formAmount)
    if (!numAmount || numAmount <= 0) {
      setFormError('Nominal transaksi harus lebih besar dari 0')
      return
    }

    const selectedCategory = categories.find((c) => c.id === formCategoryId) || {
      id: 'other',
      name: 'Other',
      icon: '📦',
      type: 'BOTH' as const,
    }

    const selectedWallet = wallets.find((w) => w.id === formWalletId)

    if (!user?.uid) return

    setSubmitting(true)
    try {
      if (editingTx) {
        // UPDATE Existing
        await transactionService.update(user.uid, editingTx.id, {
          type: formType,
          amount: numAmount,
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          categoryIcon: selectedCategory.icon,
          description: formDescription || selectedCategory.name,
          transactionDate: formDate,
          walletId: selectedWallet?.id,
          walletName: selectedWallet?.name,
        })
        setEditingTx(null)
      } else {
        // CREATE New
        const payload: CreateTransactionDto = {
          type: formType,
          amount: numAmount,
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          categoryIcon: selectedCategory.icon,
          description: formDescription || selectedCategory.name,
          transactionDate: formDate,
          walletId: selectedWallet?.id,
          walletName: selectedWallet?.name,
        }
        await transactionService.create(user.uid, payload)

        // Adjust wallet balance if wallet is selected
        if (selectedWallet) {
          const delta = formType === 'INCOME' ? numAmount : -numAmount
          await walletService.adjustWalletBalance(user.uid, selectedWallet.id, delta)
        }

        setIsAddModalOpen(false)
      }

      // Reset
      setFormAmount('')
      setFormDescription('')
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[transactions] Error saving transaction:', err)
      const errObj = err as { message?: string }
      setFormError(errObj.message || 'Gagal menyimpan transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Confirmation Modal State
  const [txToDelete, setTxToDelete] = useState<string | null>(null)
  const [isDeletingTx, setIsDeletingTx] = useState(false)

  const handleConfirmDelete = async () => {
    if (!user?.uid || !txToDelete) return
    setIsDeletingTx(true)

    try {
      const tx = transactions.find((t) => t.id === txToDelete)
      if (tx && tx.walletId) {
        // Revert wallet balance
        const delta = tx.type === 'INCOME' ? -tx.amount : tx.amount
        await walletService.adjustWalletBalance(user.uid, tx.walletId, delta)
      }

      await transactionService.delete(user.uid, txToDelete)
      setTxToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[transactions] Error deleting transaction:', err)
    } finally {
      setIsDeletingTx(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
              <ReceiptText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Daftar Transaksi
              </h1>
              <p className="text-xs text-slate-400">
                Kelola, cari, filter, dan perbaiki seluruh catatan keuangan pribadimu
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            variant="secondary"
            size="sm"
            onClick={() => setIsScanModalOpen(true)}
            className="text-xs sm:text-sm text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
            leftIcon={<Camera className="w-4 h-4 text-purple-400" />}
          >
            Scan Struk AI
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => {
              setEditingTx(null)
              setFormAmount('')
              setFormDescription('')
              setFormDate(new Date().toISOString().split('T')[0])
              setIsAddModalOpen(true)
            }}
            className="text-xs sm:text-sm px-3 sm:px-4 ml-auto sm:ml-0"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Catat Transaksi
          </Button>
        </div>
      </div>

      {/* 3 Summary Badges for Filtered Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pemasukan (Terfilter)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-green-400 tabular-nums">
              +{formatRupiah(filteredIncome)}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-green-500/10 text-green-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pengeluaran (Terfilter)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-red-400 tabular-nums">
              -{formatRupiah(filteredExpense)}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Selisih Arus Kas
            </span>
            <span
              className={cn(
                'text-base sm:text-lg font-bold font-mono tabular-nums',
                filteredNet >= 0 ? 'text-white' : 'text-red-400'
              )}
            >
              {formatRupiah(filteredNet)}
            </span>
          </div>
          <Badge variant={filteredNet >= 0 ? 'brand' : 'expense'} size="sm">
            {filteredTransactions.length} Data
          </Badge>
        </div>
      </div>

      {/* Filter & Search Bar (Responsive Stack) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1a1d27] border border-[#2d3348] flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Cari transaksi atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#21263a] p-1 rounded-xl border border-[#2d3348] w-full md:w-auto">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-1 md:flex-none text-center',
              typeFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('INCOME')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-1 md:flex-none text-center',
              typeFilter === 'INCOME'
                ? 'bg-green-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('EXPENSE')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-1 md:flex-none text-center',
              typeFilter === 'EXPENSE'
                ? 'bg-red-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Pengeluaran
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="w-full md:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#21263a] text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={() => setSortOrder((p) => (p === 'desc' ? 'asc' : 'desc'))}
          className="px-3 py-2.5 rounded-xl bg-[#21263a] hover:bg-[#2d3348] border border-[#2d3348] text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer w-full md:w-auto justify-center shrink-0"
          title="Ubah Urutan Tanggal"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-green-400" />
          <span>{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
        </button>
      </div>

      {/* Transaction Table / List */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d3348]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-green-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white">
              Menampilkan {filteredTransactions.length} dari {transactions.length} Transaksi
            </h3>
          </div>
          {(searchQuery || typeFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('ALL')
                setCategoryFilter('ALL')
              }}
              className="text-xs text-green-400 hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-2">🔍</div>
            <h4 className="text-sm font-semibold text-slate-300 mb-1">
              Tidak ada transaksi yang cocok
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Coba sesuaikan kata kunci pencarian atau reset filter untuk melihat semua data.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'INCOME'
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-[#21263a]/50 hover:bg-[#21263a] border border-[#2d3348] transition-all group"
                >
                  {/* Left info */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1a1d27] border border-[#2d3348] text-base sm:text-lg flex items-center justify-center shrink-0">
                      {tx.categoryIcon || '📦'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[220px]">
                          {tx.description}
                        </span>
                        <Badge variant={isIncome ? 'income' : 'expense'} size="sm">
                          {tx.categoryName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] sm:text-xs text-slate-400">
                          {tx.transactionDate}
                        </span>
                        {tx.walletName && (
                          <span className="text-[10px] text-blue-300 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 font-medium">
                            {tx.walletName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right actions & amount */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
                    <span
                      className={cn(
                        'text-xs sm:text-base font-bold font-mono tabular-nums tracking-tight',
                        isIncome ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tx)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1d27] transition-all cursor-pointer"
                        title="Edit transaksi"
                      >
                        <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxToDelete(tx.id)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#1a1d27] transition-all cursor-pointer"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deleting Transaction */}
      <ConfirmModal
        isOpen={Boolean(txToDelete)}
        title="Hapus Transaksi?"
        description="Apakah Anda yakin ingin menghapus catatan transaksi ini? Data yang dihapus tidak dapat dipulihkan."
        confirmText="Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
        loading={isDeletingTx}
        onConfirm={handleConfirmDelete}
        onClose={() => setTxToDelete(null)}
      />

      {/* Modal Add / Edit Transaction (Responsive Bottom-sheet style on mobile) */}
      {(isAddModalOpen || editingTx !== null) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1d27] border border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {editingTx ? 'Edit Data Transaksi' : 'Catat Transaksi Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false)
                  setEditingTx(null)
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
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#21263a] border border-[#2d3348]">
                <button
                  type="button"
                  onClick={() => setFormType('EXPENSE')}
                  className={cn(
                    'py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    formType === 'EXPENSE'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('INCOME')}
                  className={cn(
                    'py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                    formType === 'INCOME'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount */}
              <FormField label="Nominal (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </FormField>

              {/* Category Selector */}
              <FormField label="Kategori" required>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border border-[#2d3348]/40 rounded-xl bg-[#131620]/50">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormCategoryId(cat.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer',
                        formCategoryId === cat.id
                          ? 'bg-green-500/20 border-green-500/50 text-white font-bold'
                          : 'bg-[#21263a] border-[#2d3348] text-slate-300 hover:border-slate-500'
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="truncate w-full text-center text-[10px]">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Wallet / Source Account Selector */}
              {wallets.length > 0 && (
                <FormField label="Kantong / Sumber Dana">
                  <select
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    className="w-full bg-[#21263a] text-slate-100 rounded-xl px-4 py-3 text-xs sm:text-sm border border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name} ({formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              {/* Description */}
              <FormField label="Keterangan / Catatan">
                <Input
                  placeholder="Contoh: Beli bensin motor"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </FormField>

              {/* Date */}
              <FormField label="Tanggal Transaksi" required>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d3348] mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setEditingTx(null)
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
                  {editingTx ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApplyResult={handleApplyScanResult}
      />
    </div>
  )
}
