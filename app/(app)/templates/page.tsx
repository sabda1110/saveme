'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePageTour } from '@/hooks/usePageTour'
import { quickTemplateService } from '@/lib/services/quick-template.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { transactionService, type CreateTransactionDto } from '@/lib/services/transaction.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { ManageTemplatesModal } from '@/components/organisms/ManageTemplatesModal'
import { ManageCategoryModal } from '@/components/organisms/ManageCategoryModal'
import type { QuickTemplate, Category, Wallet, CategoryType } from '@/types'
import {
  Zap,
  Tag,
  PlusCircle,
  Trash2,
  Edit2,
  RefreshCw,
  ArrowRight,
  X,
  CheckCircle2,
  Layers,
  EyeOff,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type TabType = 'templates' | 'categories'
type CategoryFilter = 'ALL' | 'EXPENSE' | 'INCOME' | 'CUSTOM' | 'HIDDEN'

export default function TemplatesPage() {
  const { user } = useAuth()
  usePageTour('templatesTour')

  const [activeTab, setActiveTab] = useState<TabType>('templates')
  const [templates, setTemplates] = useState<QuickTemplate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [isManageModalOpen, setIsManageModalOpen] = useState(false)

  const [selectedTemplateForTx, setSelectedTemplateForTx] = useState<QuickTemplate | null>(null)
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txCategoryId, setTxCategoryId] = useState('')
  const [txWalletId, setTxWalletId] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [submittingTx, setSubmittingTx] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  const [templateToDelete, setTemplateToDelete] = useState<QuickTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState(false)

  const [categoryToHide, setCategoryToHide] = useState<Category | null>(null)
  const [hidingCategory, setHidingCategory] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [resettingHidden, setResettingHidden] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [tpls, cats, userWallets] = await Promise.all([
          quickTemplateService.getUserTemplates(user.uid),
          categoryService.getCategories(user.uid, { includeHidden: true }),
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

  const hiddenCount = useMemo(
    () => categories.filter((c) => Boolean(c.isHidden)).length,
    [categories]
  )

  const activeCount = useMemo(
    () => categories.filter((c) => !c.isHidden).length,
    [categories]
  )

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (categoryFilter === 'HIDDEN') return Boolean(cat.isHidden)
      if (cat.isHidden) return false
      if (categoryFilter === 'CUSTOM') return Boolean(cat.isCustom)
      if (categoryFilter === 'EXPENSE') return cat.type === 'EXPENSE' || cat.type === 'BOTH'
      if (categoryFilter === 'INCOME') return cat.type === 'INCOME' || cat.type === 'BOTH'
      return true
    })
  }, [categories, categoryFilter])

  const handleUseTemplate = (tpl: QuickTemplate) => {
    setSelectedTemplateForTx(tpl)
    setTxAmount(tpl.amount.toString())
    setTxDescription(tpl.name)
    setTxCategoryId(tpl.categoryId || categories.find((c) => !c.isHidden)?.id || 'other')
    setTxWalletId(tpl.walletId || wallets[0]?.id || '')
    setTxDate(new Date().toISOString().split('T')[0])
    setTxError(null)
    setIsTxModalOpen(true)
  }

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

  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete || !user?.uid) return
    setDeletingTemplate(true)
    try {
      await quickTemplateService.deleteTemplate(user.uid, templateToDelete.id)
      setTemplateToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[templates] Error deleting template:', err)
    } finally {
      setDeletingTemplate(false)
    }
  }

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete || !user?.uid) return
    setDeletingCategory(true)
    try {
      await categoryService.deleteCustomCategory(user.uid, categoryToDelete.id)
      setCategoryToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[templates] Error deleting custom category:', err)
    } finally {
      setDeletingCategory(false)
    }
  }

  const handleConfirmHideCategory = async () => {
    if (!categoryToHide || !user?.uid) return
    setHidingCategory(true)
    try {
      await categoryService.hideDefaultCategory(user.uid, categoryToHide.id)
      setCategoryToHide(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[templates] Error hiding default category:', err)
    } finally {
      setHidingCategory(false)
    }
  }

  const handleUnhideCategory = async (cat: Category) => {
    if (!user?.uid) return
    try {
      await categoryService.unhideDefaultCategory(user.uid, cat.id)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[templates] Error unhiding default category:', err)
    }
  }

  const handleConfirmResetHidden = async () => {
    if (!user?.uid) return
    setResettingHidden(true)
    try {
      await categoryService.resetHiddenCategories(user.uid)
      setIsResetConfirmOpen(false)
      setCategoryFilter('ALL')
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[templates] Error resetting hidden categories:', err)
    } finally {
      setResettingHidden(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div id="templates-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Template & Kategori
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Kelola template transaksi cepat dan atur kategori aktif sesuai kebutuhan finansial Anda.
          </p>
        </div>

        <div id="templates-action-section" className="flex items-center gap-2.5">
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

          {activeTab === 'templates' ? (
            <Button
              variant="glow"
              size="sm"
              onClick={() => setIsManageModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="text-xs sm:text-sm"
            >
              Tambah Template Baru
            </Button>
          ) : (
            <Button
              variant="glow"
              size="sm"
              onClick={() => {
                setCategoryToEdit(null)
                setIsCategoryModalOpen(true)
              }}
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="text-xs sm:text-sm"
            >
              Tambah Kategori Baru
            </Button>
          )}
        </div>
      </div>

      {/* Tab Segmented Control */}
      <div id="templates-tabs-toggle" className="flex items-center p-1 bg-slate-100 dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer',
            activeTab === 'templates'
              ? 'bg-white dark:bg-[#21263a] text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          Template Cepat
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 dark:bg-[#2d3348] font-mono">
            {templates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer',
            activeTab === 'categories'
              ? 'bg-white dark:bg-[#21263a] text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Tag className="w-4 h-4 text-green-500" />
          Kategori Transaksi
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 dark:bg-[#2d3348] font-mono">
            {activeCount}
          </span>
        </button>
      </div>

      {/* Tab 1: Template Cepat */}
      {activeTab === 'templates' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl bg-slate-100 dark:bg-[#1a1d27] animate-pulse border border-slate-200 dark:border-[#2d3348]"
                />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#1a1d27] rounded-3xl border border-slate-200 dark:border-[#2d3348] flex flex-col items-center justify-center max-w-lg mx-auto mt-4 shadow-sm dark:shadow-xl text-slate-900 dark:text-white">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center text-3xl mb-4">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                Belum Ada Template Pengeluaran
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                Buat template untuk pengeluaran rutin harian (seperti bensin, parkir, kopi, atau makan siang) agar pencatatan transaksi tinggal 1 kali klik.
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] hover:border-amber-500/50 flex flex-col justify-between transition-all duration-200 shadow-sm dark:shadow-lg hover:shadow-amber-500/5 group text-slate-900 dark:text-white"
                >
                  <div>
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

                    <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Nominal:</span>
                      <span className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatRupiah(tpl.amount)}
                      </span>
                    </div>

                    {tpl.walletName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 mb-2">
                        <span className="text-slate-500 dark:text-slate-400">Kantong default:</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] font-medium text-slate-700 dark:text-slate-200">
                          {tpl.walletName}
                        </span>
                      </div>
                    )}
                  </div>

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
        </>
      )}

      {/* Tab 2: Kategori Transaksi */}
      {activeTab === 'categories' && (
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: `Semua Aktif (${activeCount})` },
                { id: 'EXPENSE', label: 'Pengeluaran' },
                { id: 'INCOME', label: 'Pemasukan' },
                { id: 'CUSTOM', label: 'Kustom Saya' },
                ...(hiddenCount > 0
                  ? [{ id: 'HIDDEN', label: `Dinonaktifkan (${hiddenCount})` }]
                  : []),
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCategoryFilter(f.id as CategoryFilter)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                    categoryFilter === f.id
                      ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-white'
                      : 'bg-white dark:bg-[#1a1d27] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-300 hover:border-slate-400'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Pulihkan Semua Kategori Bawaan
                </button>
              )}

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredCategories.length} kategori
              </span>
            </div>
          </div>

          {/* Categories Grid */}
          {filteredCategories.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#2d3348] text-slate-500 dark:text-slate-400">
              {categoryFilter === 'HIDDEN'
                ? 'Tidak ada kategori bawaan yang dinonaktifkan.'
                : 'Tidak ada kategori yang sesuai dengan filter ini.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className={cn(
                    'p-3.5 rounded-2xl bg-white dark:bg-[#1a1d27] border flex flex-col justify-between gap-2 shadow-xs transition-colors',
                    cat.isHidden
                      ? 'border-dashed border-slate-300 dark:border-slate-700 opacity-75'
                      : 'border-slate-200 dark:border-[#2d3348] hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-center text-xl shrink-0">
                      {cat.icon || '📦'}
                    </span>

                    {cat.isCustom ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToEdit(cat)
                            setIsCategoryModalOpen(true)
                          }}
                          title="Edit kategori"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          title="Hapus kategori kustom"
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-[#21263a]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : cat.isHidden ? (
                      <button
                        type="button"
                        onClick={() => handleUnhideCategory(cat)}
                        title="Pulihkan kategori ini"
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Pulihkan
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#21263a] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-[#2d3348]">
                          Bawaan
                        </span>
                        <button
                          type="button"
                          onClick={() => setCategoryToHide(cat)}
                          title="Nonaktifkan kategori ini dari akun Anda"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21263a]"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {cat.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-md border',
                          cat.type === 'EXPENSE'
                            ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                            : cat.type === 'INCOME'
                            ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                        )}
                      >
                        {cat.type === 'EXPENSE'
                          ? 'Pengeluaran'
                          : cat.type === 'INCOME'
                          ? 'Pemasukan'
                          : 'Keduanya'}
                      </span>

                      {cat.isCustom ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                          Kustom
                        </span>
                      ) : cat.isHidden ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/20 text-slate-500 dark:text-slate-400">
                          Nonaktif
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    {categories
                      .filter((c) => !c.isHidden)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name} {c.isCustom ? '(Kustom)' : ''}
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
          categories={categories.filter((c) => !c.isHidden)}
          wallets={wallets}
          onClose={() => setIsManageModalOpen(false)}
          onSuccess={() => {
            setIsManageModalOpen(false)
            setRefreshTrigger((p) => p + 1)
          }}
        />
      )}

      {/* Delete Template Confirmation Modal */}
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
        loading={deletingTemplate}
        onConfirm={handleConfirmDeleteTemplate}
        onClose={() => setTemplateToDelete(null)}
      />

      {/* Manage / Add / Edit Custom Category Modal */}
      {user?.uid && (
        <ManageCategoryModal
          isOpen={isCategoryModalOpen}
          userId={user.uid}
          categoryToEdit={categoryToEdit}
          onClose={() => {
            setIsCategoryModalOpen(false)
            setCategoryToEdit(null)
          }}
          onSuccess={() => {
            setRefreshTrigger((p) => p + 1)
          }}
        />
      )}

      {/* Delete Custom Category Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        title="Hapus Kategori Kustom?"
        description={
          categoryToDelete
            ? `Apakah Anda yakin ingin menghapus kategori "${categoryToDelete.name}"? Kategori ini akan dihapus secara permanen.`
            : ''
        }
        confirmText="Hapus Kategori"
        cancelText="Batal"
        variant="danger"
        loading={deletingCategory}
        onConfirm={handleConfirmDeleteCategory}
        onClose={() => setCategoryToDelete(null)}
      />

      {/* Hide / Deactivate Default Category Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(categoryToHide)}
        title="Nonaktifkan Kategori Bawaan?"
        description={
          categoryToHide
            ? `Kategori "${categoryToHide.name}" akan disembunyikan dari daftar kategori dan form transaksi akun Anda. Tindakan ini tidak memengaruhi pengguna lain, dan Anda dapat memulihkannya kembali kapan saja.`
            : ''
        }
        confirmText="Nonaktifkan Kategori"
        cancelText="Batal"
        variant="danger"
        loading={hidingCategory}
        onConfirm={handleConfirmHideCategory}
        onClose={() => setCategoryToHide(null)}
      />

      {/* Reset Hidden Categories Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Pulihkan Semua Kategori Bawaan?"
        description={`Apakah Anda ingin mengaktifkan kembali seluruh ${hiddenCount} kategori bawaan yang sebelumnya dinonaktifkan?`}
        confirmText="Pulihkan Semua"
        cancelText="Batal"
        variant="info"
        loading={resettingHidden}
        onConfirm={handleConfirmResetHidden}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </div>
  )
}
