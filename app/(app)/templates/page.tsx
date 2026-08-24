'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { quickTemplateService } from '@/lib/services/quick-template.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { transactionService, type CreateTransactionDto } from '@/lib/services/transaction.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { ManageTemplatesModal } from '@/components/organisms/ManageTemplatesModal'
import type { QuickTemplate, Category, Wallet } from '@/types'
import {
  Zap,
  PlusCircle,
  Trash2,
  RefreshCw,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export default function TemplatesPage() {
  const { user } = useAuth()

  const [templates, setTemplates] = useState<QuickTemplate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Manage Templates Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)

  // Use Template (Record Transaction) Modal State
  const [selectedTemplateForTx, setSelectedTemplateForTx] = useState<QuickTemplate | null>(null)
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txCategoryId, setTxCategoryId] = useState('')
  const [txWalletId, setTxWalletId] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [submittingTx, setSubmittingTx] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  // Delete Template Confirm State
  const [templateToDelete, setTemplateToDelete] = useState<QuickTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [tpls, cats, userWallets] = await Promise.all([
          quickTemplateService.getUserTemplates(user.uid),
          categoryService.getCategories(),
          walletService.getUserWallets(user.uid),
        ])

        if (isMounted) {
          setTemplates(tpls)
          setCategories(cats)
          setWallets(userWallets)
        }
      } catch (err) {
        console.error('[templates] Error loading data:', err)
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
  }, [user?.uid, refreshTrigger])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Open Record Transaction Modal with Pre-filled values from Template
  const handleUseTemplate = (tpl: QuickTemplate) => {
    setSelectedTemplateForTx(tpl)
    setTxAmount(tpl.amount.toString())
    setTxDescription(tpl.name)
    setTxCategoryId(tpl.categoryId || categories[0]?.id || 'other')
    setTxWalletId(tpl.walletId || wallets[0]?.id || '')
    setTxDate(new Date().toISOString().split('T')[0])
    setTxError(null)
    setIsTxModalOpen(true)
  }

  // Submit Transaction from Template
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return
    setTxError(null)

    const numAmount = Number(txAmount)
    if (!numAmount || numAmount <= 0) {
      setTxError('Nominal transaksi harus lebih besar dari 0')
      return
    }

    const selectedCategory = categories.find((c) => c.id === txCategoryId) || {
      id: 'other',
      name: 'Other',
      icon: '📦',
    }
    const selectedWallet = wallets.find((w) => w.id === txWalletId)

    setSubmittingTx(true)
    try {
      const payload: CreateTransactionDto = {
        type: 'EXPENSE',
        amount: numAmount,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        description: txDescription || selectedCategory.name,
        transactionDate: txDate,
        walletId: selectedWallet?.id,
        walletName: selectedWallet?.name,
      }

      await transactionService.create(user.uid, payload)

      if (selectedWallet) {
        await walletService.adjustWalletBalance(user.uid, selectedWallet.id, -numAmount)
      }

      setIsTxModalOpen(false)
      setSelectedTemplateForTx(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[templates] Error recording transaction:', err)
      const errObj = err as { message?: string }
      setTxError(errObj.message || 'Gagal menyimpan transaksi')
    } finally {
      setSubmittingTx(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!templateToDelete || !user?.uid) return
    setDeleting(true)
    try {
      await quickTemplateService.deleteTemplate(user.uid, templateToDelete.id)
      setTemplateToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[templates] Error deleting template:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Template Pengeluaran
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Simpan pengeluaran rutin Anda (seperti rokok/vape, parkir, kopi, bensin) agar form catatan transaksi otomatis terisi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            title="Muat ulang data"
            className="text-xs px-3"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => setIsManageModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="text-xs sm:text-sm"
          >
            Tambah Template Baru
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-[#1a1d27] animate-pulse border border-slate-200 dark:border-[#2d3348]" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#1a1d27] rounded-3xl border border-slate-200 dark:border-[#2d3348] flex flex-col items-center justify-center max-w-lg mx-auto mt-6 shadow-sm dark:shadow-xl text-slate-900 dark:text-white">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center text-3xl mb-4">
            ⚡
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
            Belum Ada Template Pengeluaran
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Buat template untuk pengeluaran yang sering Anda beli (misalnya: rokok/vape, parkir harian, kopi pagi, atau makan warteg) agar saat mencatat pengeluaran Anda tinggal 1 kali klik!
          </p>
          <Button
            variant="glow"
            size="md"
            onClick={() => setIsManageModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Buat Template Pertama
          </Button>
        </div>
      ) : (
        /* Template Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] hover:border-amber-500/50 flex flex-col justify-between transition-all duration-200 shadow-sm dark:shadow-lg hover:shadow-amber-500/5 group text-slate-900 dark:text-white"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-center shrink-0">
                      {tpl.icon}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                        {tpl.name}
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tpl.categoryName || 'Pengeluaran'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTemplateToDelete(tpl)}
                      title="Hapus template"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Nominal:</span>
                  <span className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatRupiah(tpl.amount)}
                  </span>
                </div>

                {/* Wallet Badge if set */}
                {tpl.walletName && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Kantong default:</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] font-medium text-slate-700 dark:text-slate-200">
                      {tpl.walletName}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#2d3348] mt-2">
                <Button
                  variant="glow"
                  size="sm"
                  onClick={() => handleUseTemplate(tpl)}
                  className="w-full justify-center text-xs"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Gunakan Template Ini
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Transaction Pre-filled Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedTemplateForTx?.icon || '⚡'}</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Catat Pengeluaran
                  </h3>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Data telah terisi otomatis dari template
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTxModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="flex flex-col gap-4">
              {txError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                  {txError}
                </div>
              )}

              <FormField label="Nominal Pengeluaran (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 35000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  required
                  autoFocus
                />
              </FormField>

              <FormField label="Nama Pengeluaran / Keterangan" required>
                <Input
                  placeholder="Contoh: Rokok Surya"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Kategori">
                  <select
                    value={txCategoryId}
                    onChange={(e) => setTxCategoryId(e.target.value)}
                    className="w-full bg-white dark:bg-[#21263a] text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-3 text-sm border border-slate-200 dark:border-[#2d3348] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Kantong Pembayaran">
                  <select
                    value={txWalletId}
                    onChange={(e) => setTxWalletId(e.target.value)}
                    className="w-full bg-white dark:bg-[#21263a] text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-3 text-sm border border-slate-200 dark:border-[#2d3348] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {wallets
                      .filter((w) => !w.isLocked)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon || '💳'} {w.name} ({formatRupiah(w.balance)})
                        </option>
                      ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Tanggal Transaksi" required>
                <Input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  required
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsTxModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  loading={submittingTx}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage / Create Templates Modal */}
      {user?.uid && (
        <ManageTemplatesModal
          isOpen={isManageModalOpen}
          userId={user.uid}
          templates={templates}
          categories={categories}
          wallets={wallets}
          onClose={() => setIsManageModalOpen(false)}
          onSuccess={() => {
            setIsManageModalOpen(false)
            setRefreshTrigger((p) => p + 1)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(templateToDelete)}
        title="Hapus Template?"
        description={
          templateToDelete
            ? `Apakah Anda yakin ingin menghapus template "${templateToDelete.name}" (${formatRupiah(templateToDelete.amount)})?`
            : ''
        }
        confirmText="Hapus Template"
        cancelText="Batal"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setTemplateToDelete(null)}
      />
    </div>
  )
}
