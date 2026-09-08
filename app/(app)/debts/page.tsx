'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { debtService } from '@/lib/services/debt.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { Skeleton } from '@/components/atoms/Skeleton'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import {
  HandCoins,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Calendar,
  Wallet as WalletIcon,
  X,
  FileText,
  User,
  Phone,
  Trash2,
  Edit3,
  History,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Debt, DebtType, DebtStatus, DebtRelationship, Wallet } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function DebtsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Data States
  const [debts, setDebts] = useState<Debt[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | DebtType>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID' | 'OVERDUE'>('ALL')

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false)
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailActiveTab, setDetailActiveTab] = useState<'LOANS' | 'REPAYMENTS'>('LOANS')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State: Create / Edit
  const [formType, setFormType] = useState<DebtType>('LENT')
  const [formPersonName, setFormPersonName] = useState('')
  const [formRelationship, setFormRelationship] = useState<DebtRelationship>('FRIEND')
  const [formContact, setFormContact] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0])
  const [formHasDueDate, setFormHasDueDate] = useState(false)
  const [formDueDate, setFormDueDate] = useState('')
  const [formWalletId, setFormWalletId] = useState('')
  const [formAffectWallet, setFormAffectWallet] = useState(true)
  const [formNotes, setFormNotes] = useState('')

  // Form State: Repayment
  const [repayAmount, setRepayAmount] = useState('')
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0])
  const [repayWalletId, setRepayWalletId] = useState('')
  const [repayAffectWallet, setRepayAffectWallet] = useState(true)
  const [repayNotes, setRepayNotes] = useState('')

  // Form State: Add Loan (Top-Up / Pinjam Lagi)
  const [addLoanAmount, setAddLoanAmount] = useState('')
  const [addLoanDate, setAddLoanDate] = useState(new Date().toISOString().split('T')[0])
  const [addLoanWalletId, setAddLoanWalletId] = useState('')
  const [addLoanAffectWallet, setAddLoanAffectWallet] = useState(true)
  const [addLoanNotes, setAddLoanNotes] = useState('')

  // Toast / Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const loadData = async () => {
    if (!user?.uid) return
    try {
      setLoading(true)
      const [userDebts, userWallets] = await Promise.all([
        debtService.getUserDebts(user.uid),
        walletService.getUserWallets(user.uid),
      ])
      setDebts(userDebts)
      setWallets(userWallets)
      if (userWallets.length > 0 && !formWalletId) {
        setFormWalletId(userWallets[0].id)
        setRepayWalletId(userWallets[0].id)
        setAddLoanWalletId(userWallets[0].id)
      }
    } catch (err) {
      console.error('[DebtsPage] Error loading data:', err)
      setFeedback({ type: 'error', message: 'Gagal memuat data pinjaman' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.uid])

  // Helper to check if a debt is overdue
  const isDebtOverdue = (debt: Debt) => {
    if (debt.status === 'PAID' || debt.isFlexible || !debt.dueDate) return false
    const today = new Date().toISOString().split('T')[0]
    return debt.dueDate < today
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalLentActive = 0
    let totalBorrowedActive = 0
    let overdueCount = 0
    let totalPaidOff = 0

    debts.forEach((d) => {
      const remaining = Math.max(0, d.totalAmount - (d.paidAmount || 0))
      if (d.status === 'PAID') {
        totalPaidOff += d.totalAmount
      } else {
        if (d.type === 'LENT') {
          totalLentActive += remaining
          if (isDebtOverdue(d)) overdueCount++
        } else {
          totalBorrowedActive += remaining
          if (isDebtOverdue(d)) overdueCount++
        }
      }
    })

    return {
      totalLentActive,
      totalBorrowedActive,
      overdueCount,
      totalPaidOff,
    }
  }, [debts])

  // Filtered Debts List
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      // Type Filter
      if (typeFilter !== 'ALL' && d.type !== typeFilter) return false

      // Status Filter
      if (statusFilter === 'PAID' && d.status !== 'PAID') return false
      if (statusFilter === 'UNPAID' && d.status === 'PAID') return false
      if (statusFilter === 'OVERDUE' && !isDebtOverdue(d)) return false

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const nameMatch = d.personName.toLowerCase().includes(query)
        const notesMatch = d.notes?.toLowerCase().includes(query)
        const contactMatch = d.personContact?.toLowerCase().includes(query)
        return nameMatch || notesMatch || contactMatch
      }

      return true
    })
  }, [debts, typeFilter, statusFilter, searchQuery])

  // Open Create Modal
  const handleOpenCreateModal = (defaultType: DebtType = 'LENT') => {
    setFormType(defaultType)
    setFormPersonName('')
    setFormRelationship('FRIEND')
    setFormContact('')
    setFormAmount('')
    setFormStartDate(new Date().toISOString().split('T')[0])
    setFormHasDueDate(false)
    setFormDueDate('')
    setFormAffectWallet(true)
    if (wallets.length > 0) setFormWalletId(wallets[0].id)
    setFormNotes('')
    setIsCreateModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (debt: Debt) => {
    setSelectedDebt(debt)
    setFormPersonName(debt.personName)
    setFormRelationship(debt.personRelationship || 'OTHER')
    setFormContact(debt.personContact || '')
    setFormHasDueDate(Boolean(debt.dueDate && !debt.isFlexible))
    setFormDueDate(debt.dueDate || '')
    setFormNotes(debt.notes || '')
    setIsEditModalOpen(true)
  }

  // Open Repayment Modal
  const handleOpenRepayModal = (debt: Debt) => {
    setSelectedDebt(debt)
    const remaining = Math.max(0, debt.totalAmount - (debt.paidAmount || 0))
    setRepayAmount(String(remaining))
    setRepayDate(new Date().toISOString().split('T')[0])
    setRepayAffectWallet(true)
    if (wallets.length > 0) setRepayWalletId(wallets[0].id)
    setRepayNotes('')
    setIsRepayModalOpen(true)
  }

  // Open Add Loan (Pinjam Lagi) Modal
  const handleOpenAddLoanModal = (debt: Debt) => {
    setSelectedDebt(debt)
    setAddLoanAmount('')
    setAddLoanDate(new Date().toISOString().split('T')[0])
    setAddLoanAffectWallet(true)
    if (wallets.length > 0) setAddLoanWalletId(wallets[0].id)
    setAddLoanNotes('')
    setIsAddLoanModalOpen(true)
  }

  // Handle Create Debt Submit
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return
    if (!formPersonName.trim()) {
      const err = 'Nama peminjam / pihak terkait wajib diisi'
      setFeedback({ type: 'error', message: err })
      toast.error(err)
      return
    }
    const amountNum = Number(formAmount)
    if (!amountNum || amountNum <= 0) {
      const err = 'Nominal pinjaman harus lebih besar dari Rp 0'
      setFeedback({ type: 'error', message: err })
      toast.error(err)
      return
    }

    const selectedWallet = wallets.find((w) => w.id === formWalletId)

    setSubmitting(true)
    try {
      await debtService.create(user.uid, {
        type: formType,
        personName: formPersonName,
        personRelationship: formRelationship,
        personContact: formContact,
        totalAmount: amountNum,
        startDate: formStartDate,
        dueDate: formHasDueDate && formDueDate ? formDueDate : undefined,
        isFlexible: !formHasDueDate || !formDueDate,
        walletId: formWalletId || undefined,
        walletName: selectedWallet?.name,
        affectWalletBalance: formAffectWallet,
        notes: formNotes,
      })

      const successMsg = formType === 'LENT' ? 'Catatan piutang berhasil disimpan!' : 'Catatan hutang berhasil disimpan!'
      setIsCreateModalOpen(false)
      setFeedback({
        type: 'success',
        message: successMsg,
      })
      toast.success(successMsg)
      await loadData()
    } catch (err) {
      console.error('[DebtsPage] Error creating debt:', err)
      const errMsg = 'Gagal membuat catatan pinjaman'
      setFeedback({ type: 'error', message: errMsg })
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Edit Debt Submit
  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !selectedDebt) return

    setSubmitting(true)
    try {
      await debtService.update(user.uid, selectedDebt.id, {
        personName: formPersonName,
        personRelationship: formRelationship,
        personContact: formContact,
        isFlexible: !formHasDueDate || !formDueDate,
        dueDate: formHasDueDate && formDueDate ? formDueDate : undefined,
        notes: formNotes,
      })

      const successMsg = 'Perubahan data pinjaman berhasil disimpan!'
      setIsEditModalOpen(false)
      setFeedback({ type: 'success', message: successMsg })
      toast.success(successMsg)
      await loadData()
    } catch (err) {
      console.error('[DebtsPage] Error updating debt:', err)
      const errMsg = 'Gagal memperbarui catatan pinjaman'
      setFeedback({ type: 'error', message: errMsg })
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Repayment Submit
  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !selectedDebt) return

    const amountNum = Number(repayAmount)
    if (!amountNum || amountNum <= 0) {
      const err = 'Nominal pembayaran harus lebih besar dari Rp 0'
      setFeedback({ type: 'error', message: err })
      toast.error(err)
      return
    }

    const selectedWallet = wallets.find((w) => w.id === repayWalletId)

    setSubmitting(true)
    try {
      const { newlyPaid } = await debtService.addRepayment(user.uid, selectedDebt.id, {
        amount: amountNum,
        repaymentDate: repayDate,
        walletId: repayWalletId || undefined,
        walletName: selectedWallet?.name,
        notes: repayNotes,
        affectWalletBalance: repayAffectWallet,
      })

      if (newlyPaid) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        })
      }

      const successMsg = newlyPaid ? '🎉 Selamat! Pinjaman telah lunas seluruhnya!' : 'Pembayaran cicilan berhasil dicatat!'
      setIsRepayModalOpen(false)
      setFeedback({
        type: 'success',
        message: successMsg,
      })
      toast.success(successMsg)
      await loadData()
    } catch (err) {
      console.error('[DebtsPage] Error recording repayment:', err)
      const errMsg = 'Gagal mencatat pembayaran cicilan'
      setFeedback({ type: 'error', message: errMsg })
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Add Loan (Pinjam Lagi) Submit
  const handleAddLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !selectedDebt) return

    const amountNum = Number(addLoanAmount)
    if (!amountNum || amountNum <= 0) {
      const err = 'Nominal pinjaman tambahan harus lebih besar dari Rp 0'
      setFeedback({ type: 'error', message: err })
      toast.error(err)
      return
    }

    const selectedWallet = wallets.find((w) => w.id === addLoanWalletId)

    setSubmitting(true)
    try {
      await debtService.addLoan(user.uid, selectedDebt.id, {
        amount: amountNum,
        additionDate: addLoanDate,
        walletId: addLoanWalletId || undefined,
        walletName: selectedWallet?.name,
        notes: addLoanNotes,
        affectWalletBalance: addLoanAffectWallet,
      })

      const successMsg =
        selectedDebt.type === 'LENT'
          ? `Pinjaman tambahan untuk ${selectedDebt.personName} berhasil dicatat!`
          : `Penambahan hutang ke ${selectedDebt.personName} berhasil dicatat!`

      setIsAddLoanModalOpen(false)
      setFeedback({
        type: 'success',
        message: successMsg,
      })
      toast.success(successMsg)
      await loadData()
    } catch (err) {
      console.error('[DebtsPage] Error adding loan:', err)
      const errMsg = 'Gagal menambahkan pinjaman'
      setFeedback({ type: 'error', message: errMsg })
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Debt
  const handleDeleteDebt = async () => {
    if (!user?.uid || !debtToDelete) return

    setSubmitting(true)
    try {
      await debtService.delete(user.uid, debtToDelete.id)
      setDebtToDelete(null)
      const successMsg = 'Catatan pinjaman berhasil dihapus'
      setFeedback({ type: 'success', message: successMsg })
      toast.success(successMsg)
      await loadData()
    } catch (err) {
      console.error('[DebtsPage] Error deleting debt:', err)
      const errMsg = 'Gagal menghapus catatan pinjaman'
      setFeedback({ type: 'error', message: errMsg })
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Share Reminder to WhatsApp
  const handleSendWhatsAppReminder = (debt: Debt) => {
    const remaining = Math.max(0, debt.totalAmount - (debt.paidAmount || 0))
    const formattedRemaining = formatRupiah(remaining)
    const formattedTotal = formatRupiah(debt.totalAmount)

    let messageText = ''
    if (debt.isFlexible || !debt.dueDate) {
      messageText = `Halo ${debt.personName}, semoga kabarnya sehat selalu ya. Sekadar catatan pengingat santai terkait pinjaman sebesar ${formattedTotal} pada tanggal ${debt.startDate}. Saat ini sisa yang belum adalah ${formattedRemaining}. Kabari saja ya nanti kalau sudah senggang / ada rezeki. Terima kasih banyak! 🙏`
    } else {
      messageText = `Halo ${debt.personName}, sekadar catatan pengingat santai terkait pinjaman sebesar ${formattedTotal} pada tanggal ${debt.startDate}. Saat ini sisa yang belum dibayar adalah ${formattedRemaining}, yang jatuh tempo pada ${debt.dueDate}. Terima kasih banyak ya! 🙏`
    }

    let phoneParam = ''
    if (debt.personContact) {
      let cleaned = debt.personContact.replace(/[^0-9]/g, '')
      if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1)
      }
      phoneParam = cleaned
    }

    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`

    window.open(waUrl, '_blank')
  }

  // Helper relationship badge color
  const getRelationshipBadge = (rel?: DebtRelationship) => {
    switch (rel) {
      case 'FAMILY':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Keluarga</span>
      case 'FRIEND':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Teman</span>
      case 'COLLEAGUE':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Rekan Kerja</span>
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">Lainnya</span>
    }
  }

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto">
      {/* 1. Top Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Hutang &amp; Piutang
                  </h1>
                  <Badge variant="brand" size="sm">
                    Peminjaman
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Catat peminjaman uang keluarga atau teman dengan pelacakan cicilan dan pengingat WhatsApp santun.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="glow"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenCreateModal('LENT')}
              className="w-full sm:w-auto shadow-md"
            >
              Catat Pinjaman Baru
            </Button>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            'p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in',
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Stat Cards Grid (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Piutang Aktif (Uang Dipinjamkan) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="truncate">Piutang Saya (Dipinjamkan)</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatRupiah(metrics.totalLentActive)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
            Uang Anda yang belum kembali
          </span>
        </div>

        {/* Card 2: Hutang Aktif (Saya Pinjam) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="truncate">Hutang Saya (Dipinjam)</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
            {formatRupiah(metrics.totalBorrowedActive)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
            Kewajiban bayar ke orang lain
          </span>
        </div>

        {/* Card 3: Perlu Ditagih / Lewat Tempo */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="truncate">Lewat Jatuh Tempo</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {metrics.overdueCount} <span className="text-xs font-sans font-normal text-slate-500">pinjaman</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
            Khusus pinjaman yang bertenggat
          </span>
        </div>

        {/* Card 4: Berhasil Lunas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="truncate">Selesai / Lunas</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-blue-600 dark:text-blue-400 tracking-tight">
            {formatRupiah(metrics.totalPaidOff)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
            Akumulasi transaksi selesai
          </span>
        </div>
      </div>

      {/* 3. Filter Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141824] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
        {/* Segmented Type Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0e1118] p-1 rounded-xl border border-slate-200/60 dark:border-white/6 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              typeFilter === 'ALL'
                ? 'bg-white dark:bg-[#1c2233] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Semua Tipe
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('LENT')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              typeFilter === 'LENT'
                ? 'bg-white dark:bg-[#1c2233] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Piutang (Dipinjamkan)</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('BORROWED')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              typeFilter === 'BORROWED'
                ? 'bg-white dark:bg-[#1c2233] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Hutang (Dipinjam)</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama orang / catatan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0e1118] border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0e1118] border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none shrink-0 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNPAID">Belum Lunas</option>
            <option value="OVERDUE">Lewat Tempo</option>
            <option value="PAID">Lunas</option>
          </select>
        </div>
      </div>

      {/* 4. Debts Cards List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/6 text-slate-400 flex items-center justify-center mx-auto">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Belum ada catatan pinjaman
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Tidak ada pinjaman yang sesuai dengan filter pencarian Anda.'
                : 'Mulai catat uang yang dipinjam teman atau keluarga agar riwayatnya rapi dan tidak terlupakan.'}
            </p>
          </div>
          {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('ALL')
                setStatusFilter('ALL')
              }}
            >
              Reset Filter
            </Button>
          ) : (
            <Button
              variant="glow"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenCreateModal('LENT')}
            >
              Catat Pinjaman Baru
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDebts.map((debt) => {
            const isLent = debt.type === 'LENT'
            const remaining = Math.max(0, debt.totalAmount - (debt.paidAmount || 0))
            const progress = Math.min(100, Math.round(((debt.paidAmount || 0) / debt.totalAmount) * 100))
            const overdue = isDebtOverdue(debt)
            const isPaid = debt.status === 'PAID'

            return (
              <div
                key={debt.id}
                className={cn(
                  'p-5 rounded-2xl bg-white dark:bg-[#141824] border transition-all duration-200 shadow-xs flex flex-col justify-between gap-4',
                  overdue
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : isPaid
                    ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                {/* Card Top: Person & Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                          isLent
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {isLent ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {debt.personName}
                          </h4>
                          {getRelationshipBadge(debt.personRelationship)}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span>{isLent ? 'Dipinjamkan' : 'Meminjam'} • {debt.startDate}</span>
                          {debt.personContact && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{debt.personContact}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isPaid ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Lunas</span>
                        </span>
                      ) : overdue ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Lewat Tempo</span>
                        </span>
                      ) : debt.status === 'PARTIAL' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Dicicil ({progress}%)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-white/10">
                          Belum Bayar
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amounts & Progress Bar */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0e1118]/80 border border-slate-200/60 dark:border-white/6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Total Pinjaman</span>
                      <span className="font-mono font-black text-slate-900 dark:text-white">
                        {formatRupiah(debt.totalAmount)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          isPaid ? 'bg-emerald-500' : isLent ? 'bg-emerald-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>Sudah bayar: {formatRupiah(debt.paidAmount || 0)}</span>
                      <span className={cn('font-bold', remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600')}>
                        {remaining > 0 ? `Sisa: ${formatRupiah(remaining)}` : 'Lunas'}
                      </span>
                    </div>
                  </div>

                  {/* Due Date & Notes */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Tenggat Waktu:</span>
                      </span>
                      {debt.isFlexible || !debt.dueDate ? (
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-white/6 px-2 py-0.5 rounded-md">
                          Tanpa Tenggat (Fleksibel)
                        </span>
                      ) : (
                        <span className={cn('font-medium', overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300')}>
                          {debt.dueDate} {overdue && '(Lewat Tempo)'}
                        </span>
                      )}
                    </div>

                    {debt.walletName && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <WalletIcon className="w-3 h-3" />
                          <span>Kantong Terkait:</span>
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{debt.walletName}</span>
                      </div>
                    )}

                    {debt.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate pt-0.5">
                        &quot;{debt.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/6 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Catat Cicilan / Pelunasan */}
                    {!isPaid && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenRepayModal(debt)}
                        className="text-xs h-8 px-2.5"
                      >
                        + Cicilan
                      </Button>
                    )}

                    {/* Tambah Pinjaman / Pinjam Lagi */}
                    <button
                      type="button"
                      onClick={() => handleOpenAddLoanModal(debt)}
                      title={debt.type === 'LENT' ? 'Pinjamkan uang lagi ke orang ini' : 'Tambah pinjaman dari orang ini'}
                      className="h-8 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Pinjam Lagi</span>
                    </button>

                    {/* Tagih via WhatsApp (Hanya untuk Piutang yang belum lunas) */}
                    {isLent && !isPaid && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppReminder(debt)}
                        title="Kirim pengingat santun via WhatsApp"
                        className="h-8 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tagih WA</span>
                      </button>
                    )}

                    {/* Lihat Riwayat (Cicilan & Penambahan Pinjaman) */}
                    {((debt.repayments && debt.repayments.length > 0) || (debt.additions && debt.additions.length > 0)) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDebt(debt)
                          setDetailActiveTab(debt.repayments && debt.repayments.length > 0 ? 'REPAYMENTS' : 'LOANS')
                          setIsDetailModalOpen(true)
                        }}
                        className="h-8 px-2.5 rounded-xl bg-slate-100 dark:bg-white/6 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Riwayat ({(debt.repayments?.length || 0) + (debt.additions?.length || 0)})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDebt(debt)
                          setDetailActiveTab('LOANS')
                          setIsDetailModalOpen(true)
                        }}
                        className="h-8 px-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                        title="Lihat Rincian Pinjaman"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Rincian</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(debt)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                      title="Edit Data Pinjaman"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDebtToDelete(debt)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-all cursor-pointer"
                      title="Hapus Catatan"
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

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE DEBT (STICKY HEADER & STICKY FOOTER 3-TIER FLEXBOX) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header (Sticky) */}
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Catat Pinjaman Baru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Catat saat Anda meminjamkan atau meminjam uang
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="createDebtForm" onSubmit={handleCreateDebt} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Type Switcher: Lent vs Borrowed */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Arah Pinjaman
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('LENT')}
                    className={cn(
                      'p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                      formType === 'LENT'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'bg-slate-50 dark:bg-[#0e1118] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      <span>Saya Meminjamkan</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">
                      Piutang (Teman/keluarga pinjam ke saya)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('BORROWED')}
                    className={cn(
                      'p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer',
                      formType === 'BORROWED'
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                        : 'bg-slate-50 dark:bg-[#0e1118] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4 text-amber-600" />
                      <span>Saya Meminjam</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">
                      Hutang (Saya meminjam ke orang lain)
                    </span>
                  </button>
                </div>
              </div>

              {/* Person Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {formType === 'LENT' ? 'Nama Peminjam' : 'Nama Pemberi Pinjaman'} <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: Budi, Kak Rina, Om Dedi..."
                  value={formPersonName}
                  onChange={(e) => setFormPersonName(e.target.value)}
                />
              </div>

              {/* Relationship & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Hubungan Relasi
                  </label>
                  <select
                    value={formRelationship}
                    onChange={(e) => setFormRelationship(e.target.value as DebtRelationship)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0e1118] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="FAMILY">Keluarga</option>
                    <option value="FRIEND">Teman</option>
                    <option value="COLLEAGUE">Rekan Kerja</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    No. WhatsApp (Opsional)
                  </label>
                  <Input
                    type="tel"
                    placeholder="Contoh: 08123456789"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nominal Pinjaman (Rp) <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="1"
                  placeholder="Contoh: 500000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
                {formAmount && Number(formAmount) > 0 && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(Number(formAmount))}
                  </span>
                )}
              </div>

              {/* Start Date & Due Date Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Tanggal Dipinjamkan <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Tanggal Jatuh Tempo
                  </label>
                  {formHasDueDate ? (
                    <Input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                    />
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/6 text-slate-500 text-xs italic flex items-center justify-between">
                      <span>Tanpa tenggat waktu</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormHasDueDate(true)
                          const nextMonth = new Date()
                          nextMonth.setMonth(nextMonth.getMonth() + 1)
                          setFormDueDate(nextMonth.toISOString().split('T')[0])
                        }}
                        className="text-emerald-600 font-bold hover:underline"
                      >
                        + Atur Tanggal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Due Date Checkbox */}
              {formHasDueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Ada batas waktu pengembalian</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormHasDueDate(false)
                      setFormDueDate('')
                    }}
                    className="text-[11px] text-rose-500 hover:underline"
                  >
                    Hapus tenggat (Jadikan Fleksibel)
                  </button>
                </div>
              )}

              {/* Wallet Integration */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Hubungkan ke Kantong / Rekening
                  </span>
                  <input
                    type="checkbox"
                    id="affectWallet"
                    checked={formAffectWallet}
                    onChange={(e) => setFormAffectWallet(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {formAffectWallet && wallets.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {formType === 'LENT'
                        ? 'Potong saldo dari kantong:'
                        : 'Tambah saldo masuk ke kantong:'}
                    </label>
                    <select
                      value={formWalletId}
                      onChange={(e) => setFormWalletId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon || '💳'} {w.name} ({formatRupiah(w.balance)})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formType === 'LENT'
                        ? 'Saldo kantong otomatis berkurang saat pinjaman dibuat.'
                        : 'Saldo kantong otomatis bertambah saat pinjaman dicatat.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Catatan / Keperluan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Buat tambahan bayar kontrakan, talangan tiket..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0e1118] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-2 bg-slate-50 dark:bg-[#141824] shrink-0">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="createDebtForm"
                loading={submitting}
              >
                Simpan Catatan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPAYMENT MODAL (STICKY HEADER & STICKY FOOTER) */}
      {/* ========================================================================= */}
      {isRepayModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Catat Pembayaran Cicilan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Untuk: <strong>{selectedDebt.personName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRepayModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form id="repayForm" onSubmit={handleRepaymentSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Summary Balance */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200/60 dark:border-white/6 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Sisa Hutang / Piutang:</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {formatRupiah(Math.max(0, selectedDebt.totalAmount - (selectedDebt.paidAmount || 0)))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const remaining = Math.max(0, selectedDebt.totalAmount - (selectedDebt.paidAmount || 0))
                    setRepayAmount(String(remaining))
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all cursor-pointer"
                >
                  Lunasi Penuh
                </button>
              </div>

              {/* Repay Amount */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  min="1"
                  max={Math.max(0, selectedDebt.totalAmount - (selectedDebt.paidAmount || 0))}
                  placeholder="Contoh: 200000"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                />
                {repayAmount && Number(repayAmount) > 0 && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(Number(repayAmount))}
                  </span>
                )}
              </div>

              {/* Repayment Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tanggal Pembayaran <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                />
              </div>

              {/* Wallet Integration */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Hubungkan ke Saldo Kantong
                  </span>
                  <input
                    type="checkbox"
                    id="repayAffectWallet"
                    checked={repayAffectWallet}
                    onChange={(e) => setRepayAffectWallet(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {repayAffectWallet && wallets.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {selectedDebt.type === 'LENT'
                        ? 'Uang pelunasan masuk ke kantong:'
                        : 'Uang pelunasan dipotong dari kantong:'}
                    </label>
                    <select
                      value={repayWalletId}
                      onChange={(e) => setRepayWalletId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon || '💳'} {w.name} ({formatRupiah(w.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Catatan Tambahan (Opsional)
                </label>
                <Input
                  placeholder="Contoh: Cicilan ke-1, transfer via BCA..."
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                />
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-2 bg-slate-50 dark:bg-[#141824] shrink-0">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsRepayModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="repayForm"
                loading={submitting}
              >
                Simpan Pembayaran
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2.5: ADD LOAN MODAL (PINJAM LAGI) */}
      {/* ========================================================================= */}
      {isAddLoanModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedDebt.type === 'LENT' ? 'Tambah Pinjaman (Pinjamkan Lagi)' : 'Tambah Hutang (Pinjam Lagi)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pihak terkait: {selectedDebt.personName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLoanModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form id="addLoanForm" onSubmit={handleAddLoanSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Simulation Box */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-500/20 space-y-2">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block">
                  Simulasi Akumulasi Pinjaman:
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Total pinjaman saat ini:</span>
                    <span className="font-mono font-bold">{formatRupiah(selectedDebt.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 font-bold">
                    <span>+ Tambahan pinjaman baru:</span>
                    <span className="font-mono">+{formatRupiah(Number(addLoanAmount) || 0)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-blue-200 dark:border-blue-500/20 flex items-center justify-between text-slate-900 dark:text-white font-black">
                    <span>Total Pinjaman Akumulasi:</span>
                    <span className="font-mono text-sm">{formatRupiah(selectedDebt.totalAmount + (Number(addLoanAmount) || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                    <span>Sisa belum lunas nanti:</span>
                    <span className="font-mono">
                      {formatRupiah(Math.max(0, (selectedDebt.totalAmount + (Number(addLoanAmount) || 0)) - (selectedDebt.paidAmount || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Loan Amount */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nominal Tambahan (Rp) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 150000"
                  value={addLoanAmount}
                  onChange={(e) => setAddLoanAmount(e.target.value)}
                />
                {addLoanAmount && Number(addLoanAmount) > 0 && (
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                    {formatRupiah(Number(addLoanAmount))}
                  </span>
                )}
              </div>

              {/* Add Loan Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tanggal Pinjaman Tambahan <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={addLoanDate}
                  onChange={(e) => setAddLoanDate(e.target.value)}
                />
              </div>

              {/* Wallet Integration */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                      Hubungkan ke Saldo Kantong
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selectedDebt.type === 'LENT' ? 'Potong saldo kantong otomatis' : 'Tambah saldo kantong otomatis'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="addLoanAffectWallet"
                    checked={addLoanAffectWallet}
                    onChange={(e) => setAddLoanAffectWallet(e.target.checked)}
                    className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {addLoanAffectWallet && wallets.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {selectedDebt.type === 'LENT'
                        ? 'Sumber kantong dana (uang keluar):'
                        : 'Kantong penerima dana (uang masuk):'}
                    </label>
                    <select
                      value={addLoanWalletId}
                      onChange={(e) => setAddLoanWalletId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon || '💳'} {w.name} ({formatRupiah(w.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Catatan Tambahan (Opsional)
                </label>
                <Input
                  placeholder="Contoh: Pinjam lagi untuk bayar tagihan mendadak..."
                  value={addLoanNotes}
                  onChange={(e) => setAddLoanNotes(e.target.value)}
                />
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-2 bg-slate-50 dark:bg-[#141824] shrink-0">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsAddLoanModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="addLoanForm"
                loading={submitting}
              >
                Simpan &amp; Tambahkan Pinjaman
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REPAYMENT & LOAN HISTORY / DETAIL MODAL */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedDebt && (() => {
        const additionsTotal = selectedDebt.additions?.reduce((sum, a) => sum + a.amount, 0) || 0
        const initialAmount = Math.max(0, selectedDebt.totalAmount - additionsTotal)
        const remaining = Math.max(0, selectedDebt.totalAmount - (selectedDebt.paidAmount || 0))
        const totalDisbursementsCount = 1 + (selectedDebt.additions?.length || 0)
        const totalRepaymentsCount = selectedDebt.repayments?.length || 0

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Rincian &amp; Riwayat Pinjaman
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedDebt.personName} • {selectedDebt.type === 'LENT' ? 'Piutang (Anda Meminjamkan)' : 'Hutang (Anda Meminjam)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* Metrics Summary Card */}
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200/60 dark:border-white/6 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Total Pinjaman</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                      {formatRupiah(selectedDebt.totalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Sudah Dibayar</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatRupiah(selectedDebt.paidAmount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Sisa Belum Lunas</span>
                    <span className={cn('text-xs sm:text-sm font-black font-mono', remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600')}>
                      {remaining > 0 ? formatRupiah(remaining) : 'Lunas'}
                    </span>
                  </div>
                </div>

                {/* Tabs Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/6">
                  <button
                    type="button"
                    onClick={() => setDetailActiveTab('LOANS')}
                    className={cn(
                      'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer',
                      detailActiveTab === 'LOANS'
                        ? 'bg-white dark:bg-[#141824] text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    )}
                  >
                    💸 {selectedDebt.type === 'LENT' ? 'Pinjaman Diberikan' : 'Pinjaman Diterima'} ({totalDisbursementsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailActiveTab('REPAYMENTS')}
                    className={cn(
                      'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer',
                      detailActiveTab === 'REPAYMENTS'
                        ? 'bg-white dark:bg-[#141824] text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    )}
                  >
                    💳 {selectedDebt.type === 'LENT' ? 'Cicilan Masuk' : 'Cicilan Keluar'} ({totalRepaymentsCount})
                  </button>
                </div>

                {/* TAB CONTENT: LOANS (DISBURSEMENTS & ADDITIONS) */}
                {detailActiveTab === 'LOANS' && (
                  <div className="space-y-2.5">
                    {/* 1. Initial Loan */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200/60 dark:border-white/6 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Pinjaman Pokok Awal
                          </span>
                          <span className="text-[10px] text-slate-400">{selectedDebt.startDate}</span>
                        </div>
                        {selectedDebt.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {selectedDebt.notes}
                          </p>
                        )}
                        {selectedDebt.walletName && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            via {selectedDebt.walletName}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400 shrink-0">
                        {formatRupiah(initialAmount)}
                      </div>
                    </div>

                    {/* 2. Additions (Pinjam Lagi) */}
                    {selectedDebt.additions && selectedDebt.additions.length > 0 && (
                      selectedDebt.additions.map((add, idx) => (
                        <div
                          key={add.id || idx}
                          className="p-3 rounded-2xl bg-blue-50/40 dark:bg-blue-950/15 border border-blue-200/50 dark:border-blue-500/20 flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-900 dark:text-blue-300">
                                Tambahan #{idx + 1} (Pinjam Lagi)
                              </span>
                              <span className="text-[10px] text-slate-400">{add.additionDate}</span>
                            </div>
                            {add.notes && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                {add.notes}
                              </p>
                            )}
                            {add.walletName && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                via {add.walletName}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400 shrink-0">
                            +{formatRupiah(add.amount)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB CONTENT: REPAYMENTS */}
                {detailActiveTab === 'REPAYMENTS' && (
                  <div>
                    {!selectedDebt.repayments || selectedDebt.repayments.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        Belum ada catatan pembayaran cicilan yang dicatat.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDebt.repayments.map((rep, idx) => (
                          <div
                            key={rep.id || idx}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0e1118] border border-slate-200/60 dark:border-white/6 flex items-start justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  Cicilan #{idx + 1}
                                </span>
                                <span className="text-[10px] text-slate-400">{rep.repaymentDate}</span>
                              </div>
                              {rep.notes && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {rep.notes}
                                </p>
                              )}
                              {rep.walletName && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  via {rep.walletName}
                                </span>
                              )}
                            </div>

                            <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                              +{formatRupiah(rep.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#141824] shrink-0 text-xs flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Tutup
                </Button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false)
                      handleOpenAddLoanModal(selectedDebt)
                    }}
                    className="h-8 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-semibold flex items-center gap-1 transition-all cursor-pointer text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pinjam Lagi</span>
                  </button>

                  {remaining > 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setIsDetailModalOpen(false)
                        handleOpenRepayModal(selectedDebt)
                      }}
                      className="text-xs h-8 px-3"
                    >
                      + Catat Cicilan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT DEBT MODAL */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Catatan Pinjaman
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="editForm" onSubmit={handleUpdateDebt} className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nama Pihak Terkait
                </label>
                <Input
                  required
                  value={formPersonName}
                  onChange={(e) => setFormPersonName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Hubungan
                  </label>
                  <select
                    value={formRelationship}
                    onChange={(e) => setFormRelationship(e.target.value as DebtRelationship)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0e1118] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="FAMILY">Keluarga</option>
                    <option value="FRIEND">Teman</option>
                    <option value="COLLEAGUE">Rekan Kerja</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    No. WhatsApp
                  </label>
                  <Input
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tanggal Jatuh Tempo
                </label>
                {formHasDueDate ? (
                  <Input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/6 text-slate-500 text-xs italic flex items-center justify-between">
                    <span>Tanpa tenggat waktu (Fleksibel)</span>
                    <button
                      type="button"
                      onClick={() => setFormHasDueDate(true)}
                      className="text-emerald-600 font-bold hover:underline"
                    >
                      + Atur Tanggal
                    </button>
                  </div>
                )}
              </div>

              {formHasDueDate && (
                <button
                  type="button"
                  onClick={() => {
                    setFormHasDueDate(false)
                    setFormDueDate('')
                  }}
                  className="text-[11px] text-rose-500 hover:underline"
                >
                  Hapus tenggat (Jadikan Fleksibel)
                </button>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Catatan / Keperluan
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0e1118] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-2 bg-slate-50 dark:bg-[#141824] shrink-0">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="editForm"
                loading={submitting}
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(debtToDelete)}
        title="Hapus Catatan Pinjaman?"
        description={`Apakah Anda yakin ingin menghapus catatan pinjaman dengan ${debtToDelete?.personName}? Data riwayat pembayaran cicilan terkait juga akan dihapus.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        loading={submitting}
        onConfirm={handleDeleteDebt}
        onClose={() => setDebtToDelete(null)}
      />
    </div>
  )
}
