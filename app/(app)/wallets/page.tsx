'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { walletService } from '@/lib/services/wallet.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { TransferModal } from '@/components/organisms/TransferModal'
import { Skeleton } from '@/components/atoms/Skeleton'
import type { Wallet, WalletType, CreateWalletDto } from '@/types'
import {
  Wallet as WalletIcon,
  PlusCircle,
  ArrowRightLeft,
  Pencil,
  Trash2,
  Sparkles,
  X,
  CheckCircle2,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const WALLET_TYPE_OPTIONS: { type: WalletType; label: string; icon: string; defaultColor: string }[] = [
  { type: 'BANK', label: 'Rekening Bank', icon: '🏦', defaultColor: '#3b82f6' },
  { type: 'EWALLET', label: 'E-Wallet (GoPay/OVO/Shopee)', icon: '📱', defaultColor: '#8b5cf6' },
  { type: 'CASH', label: 'Uang Tunai (Cash)', icon: '💵', defaultColor: '#22c55e' },
  { type: 'OTHER', label: 'Lainnya / Investasi', icon: '📦', defaultColor: '#f59e0b' },
]

export default function WalletsPage() {
  const { user } = useAuth()

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

  // Operating: unlocked & not earmarked — counts toward daily spending limit
  const spendingWallets = useMemo(() => wallets.filter((w) => !w.isLocked && !w.isEarmarked), [wallets])
  const lockedWallets = useMemo(() => wallets.filter((w) => w.isLocked), [wallets])
  const earmarkedWallets = useMemo(() => wallets.filter((w) => w.isEarmarked && !w.isLocked), [wallets])

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
      setSyncSuccessMsg(
        `Saldo kantong "${walletName}" berhasil disinkronkan (${formatRupiah(newBal)}) sesuai riwayat transaksi!`
      )
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[wallets] Error syncing wallet:', err)
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
      setSyncSuccessMsg('Semua saldo kantong berhasil disinkronkan dengan seluruh riwayat transaksi!')
      setRefreshTrigger((p) => p + 1)
    } catch (err) {
      console.error('[wallets] Error syncing all wallets:', err)
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
      setWalletError('Nama kantong rekening wajib diisi')
      return
    }

    const numBal = Number(balance) || 0

    // Guard: saat edit, tidak boleh lock satu-satunya kantong non-locked
    if (editingWallet && isLocked && !editingWallet.isLocked && spendingWallets.length <= 1) {
      setWalletError('Tidak bisa dikunci — kamu harus punya minimal 1 kantong aktif (non-locked) sebagai saldo utama.')
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
      }

      setIsWalletModalOpen(false)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[wallets] Error saving wallet:', err)
      const errObj = err as { message?: string }
      setWalletError(errObj.message || 'Gagal menyimpan kantong rekening')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!user?.uid || !walletToDelete) return

    // Guard: harus ada minimal 1 kantong non-locked
    if (!walletToDelete.isLocked && !walletToDelete.isEarmarked && spendingWallets.length <= 1) {
      setWalletError(`Kantong "${walletToDelete.name}" tidak dapat dihapus karena merupakan satu-satunya kantong kas operasional aktifmu. Buat kantong operasional baru terlebih dahulu jika ingin menggantinya.`)
      setWalletToDelete(null)
      return
    }

    setIsDeleting(true)
    setWalletError(null)

    try {
      await walletService.deleteWallet(user.uid, walletToDelete.id)
      setWalletToDelete(null)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      console.error('[wallets] Error deleting wallet:', err)
      const errObj = err as { message?: string }
      setWalletError(errObj.message || 'Gagal menghapus kantong rekening')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-4">
      {/* Top Wallet Error / Guard Alert */}
      {walletError && !isWalletModalOpen && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 shadow-sm flex items-start justify-between gap-3 text-xs text-rose-800 dark:text-rose-300 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">Pemberitahuan Sistem</h4>
              <p className="leading-relaxed">{walletError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWalletError(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
              <WalletIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Kantong & Rekening
                </h1>
                <Badge variant="brand" size="sm">
                  Multi-Wallet
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Kelola kantong belanja operasional dan tabungan beku secara terpisah dan presisi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncAllWallets}
            disabled={syncingWalletId === 'ALL'}
            title="Hitung ulang & sinkronkan saldo semua kantong dari riwayat transaksi"
            className="text-xs px-2.5 sm:px-3 text-slate-300 hover:text-emerald-400"
            leftIcon={
              <RefreshCw
                className={cn('w-3.5 h-3.5', syncingWalletId === 'ALL' && 'animate-spin text-emerald-400')}
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
            className="text-xs px-2.5 sm:px-3"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          {wallets.length >= 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              leftIcon={<ArrowRightLeft className="w-4 h-4 text-blue-400" />}
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
            className="text-xs sm:text-sm"
          >
            Tambah Kantong
          </Button>
        </div>
      </div>

      {/* Sync Success Notification Banner */}
      {syncSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{syncSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncSuccessMsg(null)}
            className="p-1 rounded-lg text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Guard Error Banner (delete/lock blocked) */}
      {walletError && !editingWallet && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">{walletError}</span>
          </div>
          <button
            type="button"
            onClick={() => setWalletError(null)}
            className="p-1 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && wallets.length === 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-xs space-y-3"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-2.5 w-44" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/8 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-36" />
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-white/8">
                  <Skeleton className="h-9 rounded-xl" />
                  <Skeleton className="h-9 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 4 Summary Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* 1. Kas Operasional Likuid */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-green-500/30 shadow-sm dark:shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5" /> Kas Operasional (Belanja)
                </span>
                <Badge variant="brand" size="sm">
                  {spendingWallets.length} Kantong
                </Badge>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-green-600 dark:text-green-400 tabular-nums">
                  {formatRupiah(totalSpendingBalance)}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Uang siap pakai untuk jatah belanja harian
                </span>
              </div>
            </div>

            {/* 2. Kantong Bertujuan Khusus (Earmarked) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-blue-500/30 shadow-sm dark:shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  🎯 Kantong Bertujuan Khusus
                </span>
                <Badge variant="neutral" size="sm">
                  {earmarkedWallets.length} Kantong
                </Badge>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                  {formatRupiah(totalEarmarkedBalance)}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Bisa dipakai, tidak masuk jatah harian
                </span>
              </div>
            </div>

            {/* 3. Simpanan & Dana Beku */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-amber-500/30 shadow-sm dark:shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Tabungan Beku &amp; Darurat
                </span>
                <Badge variant="warning" size="sm">
                  {lockedWallets.length} Kantong
                </Badge>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatRupiah(totalLockedBalance)}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Dana aman (dikecualikan dari jatah harian)
                </span>
              </div>
            </div>

            {/* 3. Total Keseluruhan Dana */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-[#1a1d27] dark:to-[#1a1d27] border border-blue-500/30 shadow-sm dark:shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Total Seluruh Dana
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {wallets.length} Kantong Total
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                  {formatRupiah(totalWalletBalance)}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Akumulasi seluruh aset di kantong
                </span>
              </div>
            </div>
          </div>

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] flex flex-col items-center justify-center text-center shadow-md dark:shadow-xl">
          <div className="text-5xl mb-4">💳</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Belum Ada Kantong Rekening</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Mulai daftarkan rekening operasional (BCA, GoPay, Tunai) atau kantong simpanan beku!
          </p>
          <Button variant="glow" size="md" onClick={handleOpenAdd} leftIcon={<PlusCircle className="w-4 h-4" />}>
            Buat Kantong Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wallets.map((w) => {
            const isBank = w.type === 'BANK'
            const isEwallet = w.type === 'EWALLET'
            const isCash = w.type === 'CASH'
            const isLockedWallet = Boolean(w.isLocked)
            const isEarmarkedWallet = Boolean(w.isEarmarked) && !isLockedWallet

            return (
              <div
                key={w.id}
                className={cn(
                  'p-6 rounded-2xl border shadow-sm dark:shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden',
                  isLockedWallet
                    ? 'bg-white dark:bg-gradient-to-br dark:from-amber-950/20 dark:via-[#1a1d27] dark:to-[#1a1d27] border-amber-500/40 hover:border-amber-500/70'
                    : isEarmarkedWallet
                    ? 'bg-white dark:bg-gradient-to-br dark:from-blue-900/30 dark:via-[#1a1d27] dark:to-[#1a1d27] border-blue-500/40 hover:border-blue-500/70'
                    : isBank
                    ? 'bg-white dark:bg-gradient-to-br dark:from-blue-900/30 dark:via-[#1a1d27] dark:to-[#1a1d27] border-blue-500/30 hover:border-blue-500/60'
                    : isEwallet
                    ? 'bg-white dark:bg-gradient-to-br dark:from-purple-900/30 dark:via-[#1a1d27] dark:to-[#1a1d27] border-purple-500/30 hover:border-purple-500/60'
                    : isCash
                    ? 'bg-white dark:bg-gradient-to-br dark:from-emerald-900/30 dark:via-[#1a1d27] dark:to-[#1a1d27] border-green-500/30 hover:border-green-500/60'
                    : 'bg-white dark:bg-gradient-to-br dark:from-slate-900/30 dark:via-[#1a1d27] dark:to-[#1a1d27] border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                )}
              >
                {/* Top Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] text-2xl flex items-center justify-center shrink-0 shadow-inner relative">
                        {w.icon || '💳'}
                        {isLockedWallet && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center shadow">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                        {isEarmarkedWallet && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow text-[10px]">
                            🎯
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {w.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant={isLockedWallet ? 'warning' : isBank ? 'brand' : isEwallet ? 'warning' : 'neutral'}
                            size="sm"
                          >
                            {WALLET_TYPE_OPTIONS.find((t) => t.type === w.type)?.label || w.type}
                          </Badge>
                          {isLockedWallet ? (
                            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                              🔒 Beku / Tabungan
                            </span>
                          ) : isEarmarkedWallet ? (
                            <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded border border-blue-500/30">
                              🎯 Bertujuan Khusus
                            </span>
                          ) : (
                            <span className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 font-bold px-1.5 py-0.5 rounded border border-green-500/30">
                              🟢 Operasional
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSyncWallet(w.id, w.name)}
                        disabled={syncingWalletId === w.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
                        title="Sinkronkan saldo kantong ini dengan riwayat transaksi"
                      >
                        <RefreshCw
                          className={cn(
                            'w-4 h-4',
                            syncingWalletId === w.id && 'animate-spin text-emerald-600 dark:text-emerald-400'
                          )}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(w)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
                        title="Edit Kantong"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalletToDelete(w)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer"
                        title="Hapus Kantong"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Account Number / Details */}
                  {w.accountNumber ? (
                    <div className="mb-4 text-xs font-mono text-slate-500 dark:text-slate-400 tracking-wider">
                      {w.accountNumber}
                    </div>
                  ) : (
                    <div className="mb-4 text-xs text-slate-400 dark:text-slate-500 italic">
                      {isLockedWallet
                        ? 'Tabungan Simpanan Khusus'
                        : isEarmarkedWallet
                        ? 'Kantong Bertujuan Khusus (tidak dihitung ke jatah harian)'
                        : 'Kantong Belanja Harian'}
                    </div>
                  )}

                  {/* Balance Display */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#21263a]/70 border border-slate-200 dark:border-[#2d3348] mb-2">
                    <span className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                      Saldo Tersedia:
                    </span>
                    <span
                      className={cn(
                        'text-xl sm:text-2xl font-extrabold font-mono tabular-nums tracking-tight mt-0.5 block',
                        isLockedWallet
                          ? 'text-amber-700 dark:text-amber-400'
                          : isEarmarkedWallet
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-green-700 dark:text-green-400'
                      )}
                    >
                      {formatRupiah(w.balance)}
                    </span>
                  </div>
                </div>

                {/* Footer Transfer Action */}
                <div className="pt-3 border-t border-slate-200 dark:border-[#2d3348] flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isLockedWallet ? 'Hanya untuk simpanan' : isEarmarkedWallet ? 'Bisa dipakai, bukan kas harian' : 'Siap untuk jatah belanja'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2.5"
                    leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                  >
                    Transfer
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )}

      {/* Modal Add / Edit Wallet */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {editingWallet ? 'Edit Kantong Rekening' : 'Tambah Kantong Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {walletError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {walletError}
              </div>
            )}

            <form onSubmit={handleSubmitWallet} className="flex flex-col gap-4">
              <FormField label="Nama Kantong / Rekening" required>
                <Input
                  placeholder="Contoh: BCA Utama / GoPay / Dana Darurat"
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
                        'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                        type === opt.type
                          ? 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-white shadow-md font-bold'
                          : 'bg-slate-50 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <span className="text-lg">{opt.icon}</span>
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
              <div className={cn(
                'p-3.5 rounded-xl border flex items-start gap-3 transition-all',
                isLocked
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-[#21263a] border-[#2d3348]'
              )}>
                <input
                  type="checkbox"
                  id="isLockedCheckbox"
                  checked={isLocked}
                  onChange={(e) => {
                    setIsLocked(e.target.checked)
                    if (e.target.checked) setIsEarmarked(false)
                  }}
                  className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-[#131620] border-[#2d3348] cursor-pointer"
                />
                <label htmlFor="isLockedCheckbox" className="cursor-pointer select-none text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Kunci Sebagai Kantong Beku / Simpanan
                  </span>
                  <span className="text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                    Saldo di kantong ini <strong>TIDAK AKAN</strong> dihitung ke dalam jatah belanja harian (*Safe-to-Spend*). Cocok untuk Dana Darurat, Deposito, atau Tabungan Khusus.
                  </span>
                </label>
              </div>

              {/* Earmarked Wallet Toggle */}
              <div className={cn(
                'p-3.5 rounded-xl border flex items-start gap-3 transition-all',
                isEarmarked
                  ? 'bg-blue-950/20 border-blue-500/40'
                  : 'bg-[#21263a] border-[#2d3348]'
              )}>
                <input
                  type="checkbox"
                  id="isEarmarkedCheckbox"
                  checked={isEarmarked}
                  onChange={(e) => {
                    setIsEarmarked(e.target.checked)
                    if (e.target.checked) setIsLocked(false)
                  }}
                  className="mt-1 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-[#131620] border-[#2d3348] cursor-pointer"
                />
                <label htmlFor="isEarmarkedCheckbox" className="cursor-pointer select-none text-xs">
                  <span className="font-bold text-blue-400 flex items-center gap-1">
                    🎯 Kantong Bertujuan Khusus (Earmarked)
                  </span>
                  <span className="text-slate-400 block text-[11px] mt-0.5 leading-relaxed">
                    Saldo <strong>BISA DIPAKAI</strong> seperti biasa, tapi <strong>TIDAK DIHITUNG</strong> ke jatah belanja harian. Cocok untuk: Uang Minyak, Uang Makan Rutin, Langganan Tetap, dll.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d3348] mt-1">
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
        onSuccess={() => setRefreshTrigger((p) => p + 1)}
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
