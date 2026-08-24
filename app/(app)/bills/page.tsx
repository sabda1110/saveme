'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { recurringService, type CreateRecurringBillDto } from '@/lib/services/recurring.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { MarkdownView } from '@/components/molecules/MarkdownView'
import {
  CreditCard,
  PlusCircle,
  Pencil,
  Trash2,
  Clock,
  Zap,
  CheckCircle2,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Wallet as WalletIcon,
  Layers,
  DollarSign,
  Bot,
  HelpCircle,
} from 'lucide-react'
import type { RecurringBill, Category, Wallet, BillType } from '@/types'
import { cn } from '@/lib/utils/cn'

type FilterTab = 'ALL' | 'INSTALLMENT' | 'RECURRING' | 'UNPAID' | 'PAID'

export default function BillsPage() {
  const { user, userProfile } = useAuth()

  const [bills, setBills] = useState<RecurringBill[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Filter Tab
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formType, setFormType] = useState<BillType>('RECURRING')
  const [formName, setFormName] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formDueDay, setFormDueDay] = useState('10')
  const [formAutoDeduct, setFormAutoDeduct] = useState(true)
  const [formTotalTenor, setFormTotalTenor] = useState('12')
  const [formPaidTenor, setFormPaidTenor] = useState('0')
  const [formWalletId, setFormWalletId] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Pay Modal State
  const [billToPay, setBillToPay] = useState<RecurringBill | null>(null)
  const [payWalletId, setPayWalletId] = useState('')
  const [isPayingBill, setIsPayingBill] = useState(false)
  const [paySuccessMsg, setPaySuccessMsg] = useState<string | null>(null)

  // Delete State
  const [billToDelete, setBillToDelete] = useState<string | null>(null)
  const [isDeletingBill, setIsDeletingBill] = useState(false)

  // AI Advisor State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const now = new Date()
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const [billsData, cats, wList] = await Promise.all([
          recurringService.getUserRecurringBills(user.uid),
          categoryService.getCategories(),
          walletService.getUserWallets(user.uid),
        ])

        if (isMounted) {
          setBills(billsData)
          setCategories(cats)
          setWallets(wList)
          if (cats.length > 0 && !formCategoryId) {
            setFormCategoryId(cats[0].id)
          }
          const defaultWallet = wList.find((w) => !w.isLocked)
          if (defaultWallet && !formWalletId) {
            setFormWalletId(defaultWallet.id)
            setPayWalletId(defaultWallet.id)
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
  }, [user?.uid, refreshTrigger, formCategoryId, formWalletId])

  // Unlocked wallets for payment
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked), [wallets])

  // Aggregate Calculations
  const monthlyIncome = userProfile?.monthlyIncome || 0

  const activeInstallments = useMemo(
    () =>
      bills.filter(
        (b) =>
          b.billType === 'INSTALLMENT' &&
          (!b.totalTenor || (b.paidTenor || 0) < b.totalTenor)
      ),
    [bills]
  )

  const finishedInstallments = useMemo(
    () =>
      bills.filter(
        (b) =>
          b.billType === 'INSTALLMENT' &&
          b.totalTenor &&
          (b.paidTenor || 0) >= b.totalTenor
      ),
    [bills]
  )

  const recurringBillsList = useMemo(
    () => bills.filter((b) => b.billType !== 'INSTALLMENT'),
    [bills]
  )

  const totalInstallmentMonthly = useMemo(
    () => activeInstallments.reduce((sum, b) => sum + b.amount, 0),
    [activeInstallments]
  )

  const totalRecurringMonthly = useMemo(
    () => recurringBillsList.reduce((sum, b) => sum + b.amount, 0),
    [recurringBillsList]
  )

  const totalMonthlyObligation = totalInstallmentMonthly + totalRecurringMonthly

  // Total Remaining Principal Debt across active installments
  const totalRemainingDebt = useMemo(() => {
    return activeInstallments.reduce((sum, b) => {
      const remainingTenor = Math.max(0, (b.totalTenor || 1) - (b.paidTenor || 0))
      return sum + remainingTenor * b.amount
    }, 0)
  }, [activeInstallments])

  // DSR (Debt Service Ratio) Meter: (Installments / Income) * 100
  const dsrRatio =
    monthlyIncome > 0
      ? Math.min(100, Math.round((totalInstallmentMonthly / monthlyIncome) * 100))
      : 0

  const totalBurdenRatio =
    monthlyIncome > 0
      ? Math.min(100, Math.round((totalMonthlyObligation / monthlyIncome) * 100))
      : 0

  // DSR Health Evaluation
  const dsrHealth = useMemo(() => {
    if (monthlyIncome === 0) {
      return {
        label: 'Gaji Belum Diisi',
        desc: 'Atur gaji bulanan di profil untuk melihat evaluasi Debt Service Ratio (DSR).',
        badge: 'neutral' as const,
        color: 'text-slate-400',
        barColor: 'bg-slate-500',
        icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
      }
    }
    if (dsrRatio <= 20) {
      return {
        label: 'Sangat Aman (< 20%) 🟢',
        desc: 'Beban cicilan sangat sehat! Berada jauh di bawah batas maksimal 30% dari penghasilan.',
        badge: 'brand' as const,
        color: 'text-green-400',
        barColor: 'bg-emerald-500',
        icon: <ShieldCheck className="w-4 h-4 text-green-400" />,
      }
    }
    if (dsrRatio <= 30) {
      return {
        label: 'Waspada (20% - 30%) 🟡',
        desc: 'Beban cicilan mendekati batas ideal maksimal 30%. Hindari mengambil pinjaman atau paylater baru!',
        badge: 'warning' as const,
        color: 'text-amber-400',
        barColor: 'bg-amber-400',
        icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      }
    }
    return {
      label: 'Bahaya / Overleveraged (> 30%) 🔴',
      desc: 'Beban cicilan melampaui 30% gaji! Risiko tinggi mengganggu kebutuhan harian dan dana darurat.',
      badge: 'expense' as const,
      color: 'text-red-400',
      barColor: 'bg-red-500',
      icon: <Flame className="w-4 h-4 text-red-400" />,
    }
  }, [dsrRatio, monthlyIncome])

  // Filtered List based on Active Tab
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const isPaid = b.lastProcessedMonth === currentMonthStr
      const isInstallment = b.billType === 'INSTALLMENT'

      if (activeTab === 'INSTALLMENT') return isInstallment
      if (activeTab === 'RECURRING') return !isInstallment
      if (activeTab === 'UNPAID') return !isPaid
      if (activeTab === 'PAID') return isPaid
      return true
    })
  }, [bills, activeTab, currentMonthStr])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingBill(null)
    setFormType('RECURRING')
    setFormName('')
    setFormAmount('')
    setFormDueDay('10')
    setFormAutoDeduct(true)
    setFormTotalTenor('12')
    setFormPaidTenor('0')
    setFormWalletId(spendingWallets[0]?.id || '')
    setFormNotes('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (bill: RecurringBill) => {
    setEditingBill(bill)
    setFormType(bill.billType || 'RECURRING')
    setFormName(bill.name)
    setFormAmount(bill.amount.toString())
    setFormCategoryId(bill.categoryId)
    setFormDueDay(bill.dueDay.toString())
    setFormAutoDeduct(bill.autoDeduct)
    setFormTotalTenor(bill.totalTenor ? bill.totalTenor.toString() : '12')
    setFormPaidTenor(bill.paidTenor ? bill.paidTenor.toString() : '0')
    setFormWalletId(bill.walletId || spendingWallets[0]?.id || '')
    setFormNotes(bill.notes || '')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const numAmount = Number(formAmount)
    const numDueDay = Number(formDueDay)
    const numTotalTenor = Number(formTotalTenor)
    const numPaidTenor = Number(formPaidTenor)

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
    if (formType === 'INSTALLMENT' && (!numTotalTenor || numTotalTenor < 1)) {
      setFormError('Total tenor harus minimal 1 bulan')
      return
    }

    const selectedCategory = categories.find((c) => c.id === formCategoryId) || {
      id: 'bills',
      name: 'Bills',
      icon: '📄',
      type: 'EXPENSE' as const,
    }

    const selectedWallet = wallets.find((w) => w.id === formWalletId)

    if (!user?.uid) return

    setSubmitting(true)
    try {
      const payload: CreateRecurringBillDto = {
        name: formName,
        amount: numAmount,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        dueDay: numDueDay,
        autoDeduct: formAutoDeduct,
        billType: formType,
        walletId: selectedWallet?.id,
        walletName: selectedWallet?.name,
        totalTenor: formType === 'INSTALLMENT' ? numTotalTenor : undefined,
        paidTenor: formType === 'INSTALLMENT' ? numPaidTenor : 0,
        totalPrincipal: formType === 'INSTALLMENT' ? numAmount * numTotalTenor : undefined,
        notes: formNotes.trim() || undefined,
      }

      if (editingBill) {
        await recurringService.update(user.uid, editingBill.id, payload)
      } else {
        await recurringService.create(user.uid, payload)
      }

      setIsModalOpen(false)
      setEditingBill(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[bills] Error saving bill:', err)
      const errObj = err as { message?: string }
      setFormError(errObj.message || 'Gagal menyimpan tagihan')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm Pay Handler
  const handleOpenPayModal = (bill: RecurringBill) => {
    setBillToPay(bill)
    setPayWalletId(bill.walletId || spendingWallets[0]?.id || '')
  }

  const handleConfirmPayBill = async () => {
    if (!user?.uid || !billToPay) return
    setIsPayingBill(true)

    try {
      const selectedWallet = wallets.find((w) => w.id === payWalletId)
      await recurringService.payBill(
        user.uid,
        billToPay,
        selectedWallet?.id,
        selectedWallet?.name
      )

      setPaySuccessMsg(`Pembayaran "${billToPay.name}" berhasil dicatat & saldo terpotong!`)
      setBillToPay(null)
      setRefreshTrigger((p) => p + 1)
      setTimeout(() => setPaySuccessMsg(null), 3500)
    } catch (err) {
      console.error('[bills] Error paying bill:', err)
    } finally {
      setIsPayingBill(false)
    }
  }

  // Delete Handler
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

  // AI Advisor for Bills & Debt Optimization
  const handleGenerateAiDebtAudit = async () => {
    setIsAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome,
          totalBills: totalMonthlyObligation,
          wallets,
          userQuery: `Analisis seluruh tagihan dan cicilan saya:
- Pemasukan Bulanan: Rp ${monthlyIncome}
- Total Tagihan Rutin: Rp ${totalRecurringMonthly} (${recurringBillsList.length} tagihan)
- Total Cicilan Tenor: Rp ${totalInstallmentMonthly} (${activeInstallments.length} cicilan aktif)
- Sisa Total Pokok Hutang: Rp ${totalRemainingDebt}
- Debt Service Ratio (DSR): ${dsrRatio}%
- Daftar Cicilan/Tagihan: ${bills.map((b) => `${b.name} (Rp ${b.amount}, tipe: ${b.billType || 'RECURRING'}, tenor: ${b.paidTenor || 0}/${b.totalTenor || '-'})`).join(', ')}

Berikan evaluasi kesehatan DSR, deteksi apakah ada langganan yang boros/mubazir, dan 3 langkah strategis pelunasan cicilan tercepat (Debt Snowball/Avalanche).`,
        }),
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.error || 'Gagal memanggil AI Advisor.')
      }

      const data = await response.json()
      setAiAdvice(data.advice)
    } catch (err: unknown) {
      console.error('[bills] AI Debt Audit Error:', err)
      const errObj = err as { message?: string }
      setAiError(errObj.message || 'Terjadi kendala saat meminta analisis AI.')
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Cicilan &amp; Tagihan Rutin
              </h1>
              <p className="text-xs text-slate-400">
                Kelola angsuran ber-tenor, pantau Debt Service Ratio (DSR), dan bayar tepat waktu
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
            className="text-xs px-2.5 sm:px-3 cursor-pointer"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={handleOpenAdd}
            className="text-xs sm:text-sm px-3.5 sm:px-4 cursor-pointer"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Tambah Tagihan / Cicilan
          </Button>
        </div>
      </div>

      {/* Success Toast Banner */}
      {paySuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-green-500/40 text-xs sm:text-sm text-green-300 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>{paySuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPaySuccessMsg(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 🛡️ 1. DSR (Debt Service Ratio) Meter & Sisa Pokok Hutang Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* DSR Meter Card */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1a1d27] via-[#1f2038] to-[#1a1d27] border border-purple-500/30 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Debt Service Ratio (DSR) Meter
                </span>
              </div>
              <Badge variant={dsrHealth.badge} size="sm">
                {dsrHealth.label}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className={cn('text-3xl sm:text-4xl font-black font-mono', dsrHealth.color)}>
                {dsrRatio}%
              </span>
              <span className="text-xs text-slate-400 font-sans">
                dari gaji bulanan ({formatRupiah(monthlyIncome)})
              </span>
            </div>

            {/* DSR Visual Progress Bar */}
            <div className="w-full h-3 bg-[#131620] rounded-full overflow-hidden border border-[#2d3348] p-0.5 mb-2.5">
              <div
                className={cn('h-full rounded-full transition-all duration-700', dsrHealth.barColor)}
                style={{ width: `${Math.min(100, Math.max(3, dsrRatio))}%` }}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{dsrHealth.desc}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#2d3348]/70 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Cicilan Tenor / Bln</span>
              <span className="font-bold font-mono text-purple-300">
                {formatRupiah(totalInstallmentMonthly)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Tagihan Rutin / Bln</span>
              <span className="font-bold font-mono text-blue-300">
                {formatRupiah(totalRecurringMonthly)}
              </span>
            </div>
            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400">Total Beban Wajib</span>
              <span className="font-bold font-mono text-white">
                {formatRupiah(totalMonthlyObligation)} ({totalBurdenRatio}%)
              </span>
            </div>
          </div>
        </div>

        {/* Total Sisa Pokok Hutang Card */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1a1d27] via-[#21263a] to-[#1a1d27] border border-[#2d3348] shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Sisa Pokok Hutang
              </span>
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {formatRupiah(totalRemainingDebt)}
            </div>
            <span className="text-xs text-purple-300 mt-1 block">
              Dari {activeInstallments.length} cicilan aktif yang sedang berjalan
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#131620]/70 border border-[#2d3348] mt-4 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span>Cicilan Berjalan:</span>
              <span className="font-bold font-mono text-white">{activeInstallments.length} Pos</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Cicilan Sudah Lunas:</span>
              <span className="font-bold font-mono text-green-400">
                {finishedInstallments.length} Selesai 🎉
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Tagihan Rutin Tetap:</span>
              <span className="font-bold font-mono text-blue-300">
                {recurringBillsList.length} Layanan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🤖 2. SaveMe AI Debt & Subscription Optimization Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1a1d27] via-[#1c1f30] to-[#1a1d27] border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-[#2d3348]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-green-500/30 text-green-400 shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Audit Cicilan &amp; Langganan SaveMe AI
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-300 text-[10px] font-bold">
                  AI Debt Coach
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evaluasi efisiensi tagihan langganan dan strategi pelunasan cicilan tercepat
              </p>
            </div>
          </div>

          <Button
            variant="glow"
            size="sm"
            onClick={handleGenerateAiDebtAudit}
            loading={isAiLoading}
            leftIcon={<Sparkles className="w-4 h-4 text-emerald-200" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold shrink-0 cursor-pointer"
          >
            {aiAdvice ? 'Perbarui Audit AI' : 'Jalankan Audit AI'}
          </Button>
        </div>

        {aiError && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {aiError}
          </div>
        )}

        {isAiLoading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2.5 animate-in fade-in">
            <div className="w-7 h-7 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
            <span className="text-xs text-emerald-300 font-mono">
              SaveMe AI Coach sedang menganalisis DSR dan strategi pelunasan...
            </span>
          </div>
        )}

        {!isAiLoading && aiAdvice && (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#131620]/90 border border-green-500/20 text-xs sm:text-sm text-slate-200 leading-relaxed animate-in fade-in">
            <MarkdownView content={aiAdvice} />
          </div>
        )}

        {!isAiLoading && !aiAdvice && (
          <div className="mt-3.5 p-3.5 rounded-2xl bg-[#131620]/40 border border-[#2d3348]/60 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Klik tombol di atas untuk melihat audit pintar apakah ada langganan yang boros dan strategi pelunasan cicilan tercepat (Debt Snowball/Avalanche).
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400/60 shrink-0 ml-2" />
          </div>
        )}
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-[#1a1d27] border border-[#2d3348] overflow-x-auto max-w-full no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {(
            [
              { id: 'ALL', label: `Semua (${bills.length})` },
              { id: 'INSTALLMENT', label: `Cicilan Tenor (${activeInstallments.length})` },
              { id: 'RECURRING', label: `Tagihan Rutin (${recurringBillsList.length})` },
              {
                id: 'UNPAID',
                label: `Belum Bayar (${bills.filter((b) => b.lastProcessedMonth !== currentMonthStr).length})`,
              },
              {
                id: 'PAID',
                label: `Sudah Bayar (${bills.filter((b) => b.lastProcessedMonth === currentMonthStr).length})`,
              },
            ] as { id: FilterTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. List of Bills & Installments */}
      {filteredBills.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#1a1d27] border border-[#2d3348] text-center flex flex-col items-center justify-center">
          <CreditCard className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-200 mb-1">
            Belum ada data pada tab ini
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Tambahkan cicilan motor, KPR, gadget, atau tagihan rutin seperti WiFi dan listrik untuk memantau pengeluaran wajibmu.
          </p>
          <Button variant="glow" size="sm" onClick={handleOpenAdd}>
            Tambah Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBills.map((bill) => {
            const isPaid = bill.lastProcessedMonth === currentMonthStr
            const isInstallment = bill.billType === 'INSTALLMENT'
            const isCompleted =
              isInstallment && bill.totalTenor && (bill.paidTenor || 0) >= bill.totalTenor

            const currentDay = now.getDate()
            const isDueOrPastDue = currentDay >= bill.dueDay && !isPaid && !isCompleted
            const targetWallet =
              wallets.find((w) => w.id === bill.walletId) ||
              spendingWallets[0] ||
              wallets[0]
            const hasInsufficientBalance =
              isDueOrPastDue && Boolean(targetWallet && Number(targetWallet.balance) < bill.amount)

            const paidCount = bill.paidTenor || 0
            const totalCount = bill.totalTenor || 1
            const progressPercent = Math.min(100, Math.round((paidCount / totalCount) * 100))
            const remainingTenor = Math.max(0, totalCount - paidCount)
            const remainingPrincipal = remainingTenor * bill.amount

            return (
              <div
                key={bill.id}
                className={cn(
                  'p-5 rounded-3xl bg-[#1a1d27] border transition-all shadow-xl flex flex-col justify-between relative overflow-hidden',
                  isCompleted
                    ? 'border-green-500/40 bg-gradient-to-br from-[#1a1d27] to-[#162320]'
                    : isPaid
                    ? 'border-[#2d3348]'
                    : hasInsufficientBalance
                    ? 'border-red-500/50 bg-gradient-to-br from-red-950/20 via-[#1a1d27] to-[#1a1d27]'
                    : isDueOrPastDue
                    ? 'border-amber-500/40'
                    : 'border-purple-500/30'
                )}
              >
                <div>
                  {/* Card Header: Icon + Name + Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#21263a] border border-[#2d3348] flex items-center justify-center text-xl shrink-0">
                        {bill.categoryIcon || '📄'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-base font-bold text-white truncate">{bill.name}</h4>
                        <span className="text-xs text-slate-400 truncate">
                          {bill.categoryName || 'Tagihan'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isCompleted ? (
                        <Badge variant="brand" size="sm">
                          🎉 Lunas
                        </Badge>
                      ) : isPaid ? (
                        <Badge variant="brand" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Lunas Bln Ini
                        </Badge>
                      ) : hasInsufficientBalance ? (
                        <Badge variant="expense" size="sm" className="bg-red-500/20 text-red-300 border border-red-500/40">
                          <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
                          Saldo Kurang (Tgl {bill.dueDay})
                        </Badge>
                      ) : isDueOrPastDue ? (
                        <Badge variant="warning" size="sm" className="bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3 mr-1" />
                          Jatuh Tempo (Tgl {bill.dueDay})
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          <Clock className="w-3 h-3 mr-1" />
                          Tgl {bill.dueDay}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Insufficient Balance Alert for Due Bills */}
                  {hasInsufficientBalance && (
                    <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 mb-3.5 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Gagal Autodebet (Saldo Kurang)
                        </span>
                      </div>
                      <p className="text-[11px] text-red-200/90 leading-relaxed">
                        Saldo di <strong>{targetWallet?.name || 'Kantong Utama'}</strong> ({formatRupiah(targetWallet?.balance || 0)}) tidak cukup untuk autodebet tagihan ini ({formatRupiah(bill.amount)}).
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <Link
                          href="/wallets"
                          className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline inline-flex items-center gap-1"
                        >
                          Pindahkan Dana dari Kantong Lain →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Monthly Amount */}
                  <div className="p-3.5 rounded-2xl bg-[#21263a]/50 border border-[#2d3348] mb-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Angsuran / Tagihan:</span>
                      <span className="text-base sm:text-lg font-black font-mono text-purple-300">
                        {formatRupiah(bill.amount)}
                        <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">
                          /bln
                        </span>
                      </span>
                    </div>

                    {/* Installment Tenor Progress */}
                    {isInstallment && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#2d3348]/60">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-300 font-medium">
                            Progres: <strong>{paidCount}</strong> dari {totalCount} Bulan
                          </span>
                          <span className="font-mono font-bold text-green-400">
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#131620] rounded-full overflow-hidden border border-[#2d3348]/60 p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                          <span>Sisa: {remainingTenor}x bayar</span>
                          <span className="font-mono text-slate-200">
                            Sisa Pokok: {formatRupiah(remainingPrincipal)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta Details: Auto-deduct & Wallet */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
                    <span className="flex items-center gap-1">
                      {bill.autoDeduct ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Auto-Deduct Aktif</span>
                        </>
                      ) : (
                        <span>Manual Bayar</span>
                      )}
                    </span>
                    {bill.walletName && (
                      <span className="flex items-center gap-1 text-slate-300 truncate max-w-[140px]">
                        <WalletIcon className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="truncate">{bill.walletName}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#2d3348]">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(bill)}
                      title="Edit Tagihan"
                      className="text-slate-400 hover:text-white p-2"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBillToDelete(bill.id)}
                      title="Hapus Tagihan"
                      className="text-slate-400 hover:text-red-400 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {!isCompleted && (
                    <Button
                      variant={isPaid ? 'secondary' : 'glow'}
                      size="sm"
                      disabled={isPaid}
                      onClick={() => handleOpenPayModal(bill)}
                      className={cn(
                        'text-xs font-bold cursor-pointer',
                        isPaid ? 'opacity-60' : 'bg-purple-600 hover:bg-purple-500 text-white'
                      )}
                    >
                      {isPaid ? 'Sudah Lunas Bulan Ini' : 'Bayar Sekarang'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 5. Modal: Add / Edit Tagihan & Cicilan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#1a1d27] border border-[#2d3348] shadow-2xl p-6 sm:p-7 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2d3348]">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingBill ? 'Edit Tagihan / Cicilan' : 'Tambah Tagihan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher: Tagihan Rutin vs Cicilan Ber-Tenor */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#21263a] border border-[#2d3348] mb-5">
              <button
                type="button"
                onClick={() => setFormType('RECURRING')}
                className={cn(
                  'py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
                  formType === 'RECURRING'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tagihan Rutin Tetap
              </button>
              <button
                type="button"
                onClick={() => setFormType('INSTALLMENT')}
                className={cn(
                  'py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
                  formType === 'INSTALLMENT'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                Cicilan Ber-Tenor
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="flex flex-col gap-4">
              <FormField label="Nama Tagihan / Cicilan" required>
                <Input
                  placeholder={
                    formType === 'INSTALLMENT'
                      ? 'Contoh: Cicilan Motor Vario / Laptop MacBook'
                      : 'Contoh: WiFi Indihome / Listrik PLN / Netflix'
                  }
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label={formType === 'INSTALLMENT' ? 'Angsuran per Bulan (Rp)' : 'Nominal Tagihan (Rp)'}
                  required
                >
                  <Input
                    type="number"
                    placeholder="Contoh: 1200000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Tanggal Jatuh Tempo (1 - 31)" required>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={formDueDay}
                    onChange={(e) => setFormDueDay(e.target.value)}
                    required
                  />
                </FormField>
              </div>

              {/* Installment Specific Fields */}
              {formType === 'INSTALLMENT' && (
                <div className="p-4 rounded-2xl bg-[#21263a]/60 border border-purple-500/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Total Tenor (Bulan)" required>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Contoh: 12"
                        value={formTotalTenor}
                        onChange={(e) => setFormTotalTenor(e.target.value)}
                        required
                      />
                    </FormField>

                    <FormField label="Sudah Dibayar (Bulan)">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Contoh: 3"
                        value={formPaidTenor}
                        onChange={(e) => setFormPaidTenor(e.target.value)}
                      />
                    </FormField>
                  </div>

                  {Number(formAmount) > 0 && Number(formTotalTenor) > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#131620] text-xs flex items-center justify-between text-slate-300">
                      <span>Estimasi Total Pokok:</span>
                      <span className="font-mono font-bold text-purple-300">
                        {formatRupiah(Number(formAmount) * Number(formTotalTenor))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">Kategori</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#21263a] border border-[#2d3348] text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Wallet Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">Sumber Dompet Default</label>
                  <select
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#21263a] border border-[#2d3348] text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Pilih saat pembayaran</option>
                    {spendingWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon || '💳'} {w.name} ({formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto Deduct Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#21263a]/40 border border-[#2d3348] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAutoDeduct}
                  onChange={(e) => setFormAutoDeduct(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-slate-200">Auto-Deduct Otomatis</span>
                  <span className="text-slate-400">
                    Otomatis catat transaksi pengeluaran saat tanggal jatuh tempo tiba
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2d3348]">
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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  {editingBill ? 'Simpan Perubahan' : 'Tambah Tagihan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Konfirmasi Pembayaran Tagihan & Pilihan Dompet */}
      {billToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#1a1d27] border border-[#2d3348] shadow-2xl p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2d3348]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Konfirmasi Pembayaran
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBillToPay(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-[#21263a] border border-[#2d3348] space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Nama Tagihan:</span>
                  <span className="font-bold text-white">{billToPay.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Nominal Pembayaran:</span>
                  <span className="font-mono font-bold text-lg text-purple-300">
                    {formatRupiah(billToPay.amount)}
                  </span>
                </div>
                {billToPay.billType === 'INSTALLMENT' && (
                  <div className="flex items-center justify-between text-xs text-green-400 pt-2 border-t border-[#2d3348]">
                    <span>Akan mencatat angsuran:</span>
                    <span className="font-bold">
                      Ke-{(billToPay.paidTenor || 0) + 1} dari {billToPay.totalTenor || 1} Bulan
                    </span>
                  </div>
                )}
              </div>

              {/* Wallet Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5 text-blue-400" />
                  Pilih Dompet Sumber Pembayaran
                </label>
                <select
                  value={payWalletId}
                  onChange={(e) => setPayWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#21263a] border border-[#2d3348] text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="">Tanpa potong dompet (Hanya catat transaksi)</option>
                  {spendingWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon || '💳'} {w.name} — Saldo: {formatRupiah(w.balance)}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">
                  Saldo dompet yang dipilih akan otomatis terpotong sebesar {formatRupiah(billToPay.amount)}.
                </span>

                {/* Insufficient Balance Alert in Pay Modal */}
                {(() => {
                  const selectedPayWallet = spendingWallets.find((w) => w.id === payWalletId)
                  const isInsufficient = Boolean(
                    payWalletId &&
                      selectedPayWallet &&
                      Number(selectedPayWallet.balance) < billToPay.amount
                  )
                  if (!isInsufficient) return null
                  return (
                    <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2 mt-1 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-bold text-amber-300">Peringatan:</span> Saldo di{' '}
                        <strong>{selectedPayWallet?.name}</strong> ({formatRupiah(selectedPayWallet?.balance || 0)}) kurang dari tagihan ({formatRupiah(billToPay.amount)}). Saldo akan menjadi minus jika tetap diproses.
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-[#2d3348]">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setBillToPay(null)}
                  disabled={isPayingBill}
                >
                  Batal
                </Button>
                <Button
                  variant="glow"
                  size="md"
                  loading={isPayingBill}
                  onClick={handleConfirmPayBill}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Bayar &amp; Potong Saldo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(billToDelete)}
        title="Hapus Tagihan / Cicilan?"
        description="Tagihan ini akan dihapus dari daftar tagihan rutin. Riwayat transaksi pengeluaran masa lalu tidak akan terhapus."
        confirmText="Hapus Tagihan"
        variant="danger"
        loading={isDeletingBill}
        onConfirm={handleConfirmDeleteBill}
        onClose={() => setBillToDelete(null)}
      />
    </div>
  )
}
