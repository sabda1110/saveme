'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { TransferModal } from '@/components/organisms/TransferModal'
import { WalletCard } from '@/components/organisms/WalletCard'
import { Skeleton } from '@/components/atoms/Skeleton'
import type { Wallet, WalletType, CreateWalletDto } from '@/types'
import {
  Wallet as WalletIcon,
  PlusCircle,
  ArrowRightLeft,
  Sparkles,
  X,
  CheckCircle2,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Target,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const WALLET_TYPE_OPTIONS: { type: WalletType; label: string; icon: string; defaultColor: string }[] = [
  { type: 'BANK', label: 'Rekening Bank', icon: '🏦', defaultColor: '#3b82f6' },
  { type: 'EWALLET', label: 'E-Wallet', icon: '📱', defaultColor: '#8b5cf6' },
  { type: 'CASH', label: 'Uang Tunai (Cash)', icon: '💵', defaultColor: '#22c55e' },
  { type: 'OTHER', label: 'Lainnya / Aset', icon: '📦', defaultColor: '#f59e0b' },
]

type FilterTab = 'ALL' | 'OPERATIONAL' | 'EARMARKED' | 'LOCKED'

export default function WalletsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Add / Edit Wallet Modal State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<WalletType>('BANK')
  const [balance, setBalance] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [icon, setIcon] = useState('🏦')
  const [isLocked, setIsLocked] = useState(false)
  const [isEarmarked, setIsEarmarked] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)

  // Delete Wallet Confirm Modal State
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync Balance States
  const [syncingWalletId, setSyncingWalletId] = useState<string | null>(null)
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function loadWallets() {
      if (!user?.uid) return
      setLoading(true)
      try {
        const data = await walletService.getUserWallets(user.uid)
        if (isMounted) {
          // Auto self-healing jika terdeteksi ada kantong bersaldo minus akibat reset alokasi lama
          const hasNegative = data.some((w) => Number(w.balance) < 0)
          if (hasNegative) {
            try {
              await walletService.syncAllWalletsFromTransactions(user.uid)
              const healedData = await walletService.getUserWallets(user.uid)
              if (isMounted) {
                setWallets(healedData)
                return
              }
            } catch (healErr) {
              console.warn('[wallets] Auto-heal warning:', healErr)
            }
          }
          setWallets(data)
        }
      } catch (err) {
        console.error('[wallets] Error loading wallets:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadWallets()
    return () => {
      isMounted = false
    }
  }, [user?.uid, refreshTrigger])

  // Categorized Wallets
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked && !w.isEarmarked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])
  const earmarkedWallets = useMemo(() => wallets.filter((w) => w.isEarmarked && !w.isLocked), [wallets])

  // Filtered Wallets for Display
  const filteredWallets = useMemo(() => {
    return wallets.filter((w) => {
      const matchesTab =
        activeTab === 'ALL'
          ? true
          : activeTab === 'OPERATIONAL'
          ? !w.isLocked && !w.isEarmarked
          : activeTab === 'EARMARKED'
          ? Boolean(w.isEarmarked) && !w.isLocked
          : Boolean(w.isLocked)

      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.accountNumber && w.accountNumber.includes(q))

      return matchesTab && matchesSearch
    })
  }, [wallets, activeTab, searchQuery])

  // Aggregate Balances
  const totalSpendingBalance = useMemo(
    () => spendingWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0),
    [spendingWallets]
  )

  const totalLockedBalance = useMemo(
    () => lockedWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0),
    [lockedWallets]
  )

  const totalEarmarkedBalance = useMemo(
    () => earmarkedWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0),
    [earmarkedWallets]
  )

  const totalWalletBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0),
    [wallets]
  )

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleSyncWallet = async (walletId: string, walletName: string) => {
    if (!user?.uid) return
    setSyncingWalletId(walletId)
    setSyncSuccessMsg(null)
    try {
      const newBal = await walletService.syncWalletBalanceFromTransactions(user.uid, walletId)
      const msg = `Saldo kantong "${walletName}" berhasil disinkronkan (${formatRupiah(newBal)}) sesuai riwayat transaksi!`
      setSyncSuccessMsg(msg)
      toast.success(msg)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[wallets] Error syncing wallet:', err)
      toast.error('Gagal menyinkronkan saldo kantong.')
    } finally {
      setSyncingWalletId(null)
    }
  }

  const handleSyncAllWallets = async () => {
    if (!user?.uid) return
    setSyncingWalletId('ALL')
    setSyncSuccessMsg(null)
    try {
      await walletService.syncAllWalletsFromTransactions(user.uid)
      const msg = 'Semua saldo kantong berhasil disinkronkan dengan seluruh riwayat transaksi!'
      setSyncSuccessMsg(msg)
      toast.success(msg)
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[wallets] Error syncing all wallets:', err)
      toast.error('Gagal menyinkronkan seluruh kantong rekening.')
    } finally {
      setSyncingWalletId(null)
    }
  }

  const handleOpenAdd = () => {
    setEditingWallet(null)
    setName('')
    setType('BANK')
    setBalance('')
    setAccountNumber('')
    setIcon('🏦')
    setIsLocked(false)
    setIsEarmarked(false)
    setWalletError(null)
    setIsWalletModalOpen(true)
  }

  const handleOpenEdit = (w: Wallet) => {
    setEditingWallet(w)
    setName(w.name)
    setType(w.type)
    setBalance(w.balance.toString())
    setAccountNumber(w.accountNumber || '')
    setIcon(w.icon)
    setIsLocked(Boolean(w.isLocked))
    setIsEarmarked(Boolean(w.isEarmarked))
    setWalletError(null)
    setIsWalletModalOpen(true)
  }

  const handleSubmitWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    setWalletError(null)

    if (!user?.uid) return
    if (!name.trim()) {
      const err = 'Nama kantong rekening wajib diisi'
      setWalletError(err)
      toast.error(err)
      return
    }

    const numBal = Number(balance) || 0

    // Guard: saat edit, tidak boleh lock satu-satunya kantong non-locked
    if (editingWallet && isLocked && !editingWallet.isLocked && spendingWallets.length <= 1) {
      const err = 'Tidak bisa dikunci — Anda harus memiliki minimal 1 kantong aktif sebagai kas operasional utama.'
      setWalletError(err)
      toast.warning(err)
      return
    }

    // Guard: isEarmarked & isLocked tidak bisa bersamaan
    const finalIsLocked = isLocked && !isEarmarked
    const finalIsEarmarked = isEarmarked && !isLocked

    setSubmitting(true)
    try {
      if (editingWallet) {
        // UPDATE
        await walletService.updateWallet(user.uid, editingWallet.id, {
          name: name.trim(),
          type,
          balance: numBal,
          accountNumber: accountNumber.trim(),
          icon,
          isLocked: finalIsLocked,
          isEarmarked: finalIsEarmarked,
        })
        toast.success(`Kantong "${name.trim()}" berhasil diperbarui!`)
      } else {
        // CREATE
        const payload: CreateWalletDto = {
          name: name.trim(),
          type,
          balance: numBal,
          accountNumber: accountNumber.trim(),
          icon,
          isLocked: finalIsLocked,
          isEarmarked: finalIsEarmarked,
        }
        await walletService.createWallet(user.uid, payload)
        toast.success(`Kantong "${name.trim()}" berhasil dibuat!`)
      }

      setIsWalletModalOpen(false)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[wallets] Error saving wallet:', err)
      const errObj = err as { message?: string }
      const errMsg = errObj.message || 'Gagal menyimpan kantong rekening'
      setWalletError(errMsg)
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!user?.uid || !walletToDelete) return

    // Guard: harus ada minimal 1 kantong non-locked
    if (!walletToDelete.isLocked && !walletToDelete.isEarmarked && spendingWallets.length <= 1) {
      const err = `Kantong "${walletToDelete.name}" tidak dapat dihapus karena merupakan satu-satunya kantong kas operasional aktifmu. Buat kantong operasional baru terlebih dahulu jika ingin menggantinya.`
      setWalletError(err)
      toast.warning(err)
      setWalletToDelete(null)
      return
    }

    setIsDeleting(true)
    setWalletError(null)

    try {
      await walletService.deleteWallet(user.uid, walletToDelete.id)
      toast.success(`Kantong "${walletToDelete.name}" berhasil dihapus!`)
      setWalletToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[wallets] Error deleting wallet:', err)
      const errObj = err as { message?: string }
      const errMsg = errObj.message || 'Gagal menghapus kantong rekening'
      setWalletError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-8">
      {/* Top Notification / Guard Alert Banner */}
      {walletError && !isWalletModalOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 shadow-xs flex items-start justify-between gap-3.5 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Proteksi Saldo Aktif</h4>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">{walletError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWalletError(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sync Success Notification Banner */}
      {syncSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/50 text-emerald-950 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="font-medium">{syncSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncSuccessMsg(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <WalletIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Kantong &amp; Rekening
              </h1>
              <Badge variant="brand" size="xs">
                Multi-Wallet
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola kas belanja harian, pos pengeluaran terpisah, dan tabungan beku secara presisi.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncAllWallets}
            disabled={syncingWalletId === 'ALL'}
            title="Hitung ulang & sinkronkan saldo semua kantong dari riwayat transaksi"
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
            leftIcon={
              <RefreshCw
                className={cn('w-3.5 h-3.5', syncingWalletId === 'ALL' && 'animate-spin text-emerald-500')}
              />
            }
          >
            {syncingWalletId === 'ALL' ? 'Menyinkronkan...' : 'Sinkronkan Saldo'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            title="Muat ulang data"
            className="text-xs text-slate-600 dark:text-slate-300"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          {wallets.length >= 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              leftIcon={<ArrowRightLeft className="w-4 h-4 text-blue-500" />}
              className="text-xs sm:text-sm"
            >
              Transfer Saldo
            </Button>
          )}

          <Button
            variant="glow"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="text-xs sm:text-sm shadow-md"
          >
            Tambah Kantong
          </Button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      {loading && wallets.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-2.5 w-40" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* 1. Kas Operasional (Belanja) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Unlock className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  Kas Belanja
                </span>
              </div>
              <Badge variant="brand" size="xs">
                {spendingWallets.length} Kantong
              </Badge>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatRupiah(totalSpendingBalance)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block truncate">
              Masuk jatah harian Safe-to-Spend
            </span>
          </div>

          {/* 2. Kantong Bertujuan Khusus (Earmarked) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-blue-500/40 dark:hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  Pos Khusus
                </span>
              </div>
              <Badge variant="info" size="xs">
                {earmarkedWallets.length} Kantong
              </Badge>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400 tracking-tight tabular-nums">
              {formatRupiah(totalEarmarkedBalance)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block truncate">
              Bisa dipakai, bukan kas belanja
            </span>
          </div>

          {/* 3. Tabungan Beku & Darurat */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-amber-500/40 dark:hover:border-amber-500/30 transition-all group">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  Tabungan Beku
                </span>
              </div>
              <Badge variant="warning" size="xs">
                {lockedWallets.length} Kantong
              </Badge>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
              {formatRupiah(totalLockedBalance)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block truncate">
              Dana aman &amp; simpanan khusus
            </span>
          </div>

          {/* 4. Total Seluruh Dana */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-indigo-500/40 dark:hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  Total Seluruh Dana
                </span>
              </div>
              <Badge variant="neutral" size="xs">
                {wallets.length} Kantong
              </Badge>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatRupiah(totalWalletBalance)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block truncate">
              Akumulasi seluruh aset kantong
            </span>
          </div>
        </div>
      )}

      {/* Navigation Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'ALL'
                ? 'bg-white dark:bg-[#1e2334] text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Semua
            <span className={cn(
              'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
              activeTab === 'ALL' ? 'bg-slate-100 dark:bg-white/10' : 'opacity-60'
            )}>
              {wallets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OPERATIONAL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'OPERATIONAL'
                ? 'bg-white dark:bg-[#1e2334] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            )}
          >
            Kas Belanja
            <span className={cn(
              'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
              activeTab === 'OPERATIONAL' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'opacity-60'
            )}>
              {spendingWallets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EARMARKED')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'EARMARKED'
                ? 'bg-white dark:bg-[#1e2334] text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
            )}
          >
            Pos Khusus
            <span className={cn(
              'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
              activeTab === 'EARMARKED' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'opacity-60'
            )}>
              {earmarkedWallets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOCKED')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'LOCKED'
                ? 'bg-white dark:bg-[#1e2334] text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
            )}
          >
            Tabungan Beku
            <span className={cn(
              'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
              activeTab === 'LOCKED' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'opacity-60'
            )}>
              {lockedWallets.length}
            </span>
          </button>
        </div>

        {/* Quick Search */}
        {wallets.length >= 3 && (
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari kantong / rekening..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Wallets Grid */}
      {loading && wallets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-2xl" />
              <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#141824] border border-slate-200/90 dark:border-white/10 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl mb-4 shadow-inner">
            💳
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">Belum Ada Kantong Rekening</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            Daftarkan rekening operasional (BCA, Mandiri, Tunai) atau pos simpanan khusus untuk memisahkan jatah belanja harian dengan tabungan aman.
          </p>
          <Button variant="glow" size="md" onClick={handleOpenAdd} leftIcon={<PlusCircle className="w-4 h-4" />}>
            Buat Kantong Pertama
          </Button>
        </div>
      ) : filteredWallets.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tidak ada kantong di kategori ini
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
            Coba ganti filter tab atau tambahkan kantong baru sesuai kategori yang diinginkan.
          </p>
          <Button variant="ghost" size="sm" onClick={() => { setActiveTab('ALL'); setSearchQuery(''); }}>
            Tampilkan Semua Kantong
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredWallets.map((w) => (
            <WalletCard
              key={w.id}
              wallet={w}
              onEdit={handleOpenEdit}
              onDelete={setWalletToDelete}
              onSync={handleSyncWallet}
              onTransfer={() => setIsTransferModalOpen(true)}
              isSyncing={syncingWalletId === w.id || syncingWalletId === 'ALL'}
            />
          ))}
        </div>
      )}

      {/* Modal Add / Edit Wallet */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#141824] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingWallet ? 'Edit Kantong Rekening' : 'Tambah Kantong Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Atur nama, kategori, dan peran jatah belanja kantong ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {walletError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{walletError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWallet} className="flex flex-col gap-4">
              <FormField label="Nama Kantong / Rekening" required>
                <Input
                  placeholder="Contoh: BCA Utama / GoPay / Tabungan Nikah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormField>

              {/* Type Switcher */}
              <FormField label="Jenis Kantong" required>
                <div className="grid grid-cols-2 gap-2">
                  {WALLET_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        setType(opt.type)
                        setIcon(opt.icon)
                      }}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer text-left',
                        type === opt.type
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8'
                      )}
                    >
                      <span className="text-xl shrink-0">{opt.icon}</span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Saldo Awal Kantong (Rp)" required>
                <Input
                  type="number"
                  placeholder="Contoh: 1500000"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Nomor Rekening / HP (Opsional)">
                <Input
                  placeholder="Contoh: 123-456-7890 / 0812-3456-7890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </FormField>

              {/* Locked / Frozen Wallet Toggle */}
              <div
                className={cn(
                  'p-4 rounded-2xl border flex items-start gap-3 transition-all',
                  isLocked
                    ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40 text-amber-950 dark:text-amber-200'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                )}
              >
                <input
                  type="checkbox"
                  id="isLockedCheckbox"
                  checked={isLocked}
                  onChange={(e) => {
                    setIsLocked(e.target.checked)
                    if (e.target.checked) setIsEarmarked(false)
                  }}
                  className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="isLockedCheckbox" className="cursor-pointer select-none text-xs flex-1">
                  <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Kunci Sebagai Kantong Beku / Simpanan
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] mt-1 leading-relaxed">
                    Saldo di kantong ini <strong>TIDAK AKAN</strong> dihitung ke dalam jatah belanja harian (<em>Safe-to-Spend</em>). Sangat ideal untuk Dana Darurat, Deposito, atau Tabungan Impian.
                  </span>
                </label>
              </div>

              {/* Earmarked Wallet Toggle */}
              <div
                className={cn(
                  'p-4 rounded-2xl border flex items-start gap-3 transition-all',
                  isEarmarked
                    ? 'bg-blue-500/10 dark:bg-blue-950/20 border-blue-500/40 text-blue-950 dark:text-blue-200'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                )}
              >
                <input
                  type="checkbox"
                  id="isEarmarkedCheckbox"
                  checked={isEarmarked}
                  onChange={(e) => {
                    setIsEarmarked(e.target.checked)
                    if (e.target.checked) setIsLocked(false)
                  }}
                  className="mt-1 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="isEarmarkedCheckbox" className="cursor-pointer select-none text-xs flex-1">
                  <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Kantong Bertujuan Khusus (Pos Khusus)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] mt-1 leading-relaxed">
                    Saldo <strong>BISA DIGUNAKAN</strong> bertransaksi, tapi <strong>TIDAK MENGURANGI</strong> jatah harian belanja. Cocok untuk pos terpisah seperti Bensin, Tagihan Rutin, atau Uang Sekolah.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-white/10 mt-1">
                <Button type="button" variant="ghost" size="md" onClick={() => setIsWalletModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  loading={submitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {editingWallet ? 'Simpan Perubahan' : 'Buat Kantong'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        wallets={wallets}
        userId={user?.uid || ''}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          setRefreshTrigger((p) => p + 1)
          toast.success('Transfer saldo antar kantong berhasil!')
        }}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(walletToDelete)}
        title="Hapus Kantong Rekening?"
        description={
          walletToDelete
            ? wallets.length === 1
              ? `Apakah Anda yakin ingin menghapus "${walletToDelete.name}" (${formatRupiah(walletToDelete.balance)})? Ini adalah kantong terakhir Anda. Jika dihapus, Anda dapat membuat kantong baru kapan saja.`
              : `Apakah Anda yakin ingin menghapus "${walletToDelete.name}" (${formatRupiah(walletToDelete.balance)})?`
            : ''
        }
        confirmText="Hapus Kantong"
        cancelText="Batal"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setWalletToDelete(null)}
      />
    </div>
  )
}
