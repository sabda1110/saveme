'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { useToast } from '@/context/ToastContext'
import type { Wallet, WalletType } from '@/types'
import {
  RefreshCw,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Lock,
  Target,
  Copy,
  Check,
  CreditCard,
  Smartphone,
  Banknote,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const WALLET_TYPE_CONFIG: Record<
  WalletType,
  { label: string; icon: React.ReactNode; badgeVariant: 'info' | 'purple' | 'brand' | 'warning' }
> = {
  BANK: {
    label: 'Rekening Bank',
    icon: <CreditCard className="w-3.5 h-3.5" />,
    badgeVariant: 'info',
  },
  EWALLET: {
    label: 'E-Wallet',
    icon: <Smartphone className="w-3.5 h-3.5" />,
    badgeVariant: 'purple',
  },
  CASH: {
    label: 'Uang Tunai',
    icon: <Banknote className="w-3.5 h-3.5" />,
    badgeVariant: 'brand',
  },
  OTHER: {
    label: 'Lainnya / Aset',
    icon: <Archive className="w-3.5 h-3.5" />,
    badgeVariant: 'warning',
  },
}

export interface WalletCardProps {
  wallet: Wallet
  onEdit: (wallet: Wallet) => void
  onDelete: (wallet: Wallet) => void
  onSync: (walletId: string, walletName: string) => Promise<void> | void
  onTransfer: (wallet: Wallet) => void
  isSyncing?: boolean
}

export function WalletCard({
  wallet,
  onEdit,
  onDelete,
  onSync,
  onTransfer,
  isSyncing = false,
}: WalletCardProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const isLocked = Boolean(wallet.isLocked)
  const isEarmarked = Boolean(wallet.isEarmarked) && !isLocked
  const isOperational = !isLocked && !isEarmarked

  const typeConfig = WALLET_TYPE_CONFIG[wallet.type] || WALLET_TYPE_CONFIG.OTHER

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleCopyAccountNumber = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!wallet.accountNumber) return
    try {
      await navigator.clipboard.writeText(wallet.accountNumber)
      setCopied(true)
      toast.success(`Nomor rekening ${wallet.name} berhasil disalin!`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin nomor rekening')
    }
  }

  return (
    <div
      className={cn(
        'group relative rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden',
        'bg-white dark:bg-[#141824] border shadow-xs hover:shadow-xl hover:-translate-y-1',
        isLocked
          ? 'border-amber-400/40 dark:border-amber-500/30 hover:border-amber-500/70'
          : isEarmarked
          ? 'border-blue-400/40 dark:border-blue-500/30 hover:border-blue-500/70'
          : 'border-slate-200/90 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/40'
      )}
    >
      {/* Ambient Top Glow / Accent Tint */}
      <div
        className={cn(
          'absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40 transition-opacity group-hover:opacity-70',
          isLocked
            ? 'bg-amber-500'
            : isEarmarked
            ? 'bg-blue-500'
            : wallet.type === 'EWALLET'
            ? 'bg-purple-500'
            : 'bg-emerald-500'
        )}
      />

      {/* Top Header */}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Wallet Icon Container */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border transition-transform duration-200 group-hover:scale-105',
                  isLocked
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30'
                    : isEarmarked
                    ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'
                )}
              >
                {wallet.icon || '💳'}
              </div>

              {/* Status Mini Pill On Icon */}
              {isLocked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#141824]">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}
              {isEarmarked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#141824]">
                  <Target className="w-2.5 h-2.5" />
                </div>
              )}
            </div>

            {/* Title & Badges */}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate tracking-tight mb-1.5" title={wallet.name}>
                {wallet.name}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Type Badge */}
                <Badge variant={typeConfig.badgeVariant} size="xs" icon={typeConfig.icon}>
                  {typeConfig.label}
                </Badge>

                {/* Role Badge */}
                {isLocked ? (
                  <Badge variant="warning" size="xs" icon={<Lock className="w-2.5 h-2.5" />}>
                    Tabungan Beku
                  </Badge>
                ) : isEarmarked ? (
                  <Badge variant="info" size="xs" icon={<Target className="w-2.5 h-2.5" />}>
                    Pos Khusus
                  </Badge>
                ) : (
                  <Badge variant="brand" size="xs" dot>
                    Kas Belanja
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => onSync(wallet.id, wallet.name)}
              disabled={isSyncing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Sinkronkan saldo dengan riwayat transaksi"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin text-emerald-600 dark:text-emerald-400')} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(wallet)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Edit informasi kantong"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(wallet)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Hapus kantong rekening"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Account Number or Budget Purpose Tag */}
        <div className="mb-4">
          {wallet.accountNumber ? (
            <button
              type="button"
              onClick={handleCopyAccountNumber}
              className="group/acc inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/5 text-xs font-mono text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Klik untuk salin nomor rekening"
            >
              <span className="tracking-wider">{wallet.accountNumber}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 group-hover/acc:text-slate-600 dark:group-hover/acc:text-white shrink-0" />
              )}
            </button>
          ) : (
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
              <span className="truncate">
                {isLocked
                  ? 'Dana simpanan & darurat (aman tersimpan)'
                  : isEarmarked
                  ? 'Alokasi pengeluaran rutin terpisah'
                  : 'Sumber dana belanja harian'}
              </span>
            </div>
          )}
        </div>

        {/* Hero Balance Showcase */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-colors',
            'bg-slate-50/80 dark:bg-slate-900/40',
            isLocked
              ? 'border-amber-500/20'
              : isEarmarked
              ? 'border-blue-500/20'
              : 'border-slate-200/80 dark:border-white/5'
          )}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            <span>Saldo Tersedia</span>
            <span
              className={cn(
                'font-medium text-[10px]',
                isOperational
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : isEarmarked
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-amber-700 dark:text-amber-400'
              )}
            >
              {isOperational ? 'Masuk Jatah Harian' : 'Dikecualikan Dari Jatah'}
            </span>
          </div>
          <div
            className={cn(
              'text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums',
              isLocked
                ? 'text-amber-600 dark:text-amber-400'
                : isEarmarked
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-900 dark:text-white'
            )}
          >
            {formatRupiah(wallet.balance)}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="relative z-10 pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
          {isLocked
            ? 'Dana terproteksi aman'
            : isEarmarked
            ? 'Pos dana spesifik'
            : 'Siap untuk transaksi harian'}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTransfer(wallet)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2.5 h-8 gap-1.5"
          leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
        >
          Transfer
        </Button>
      </div>
    </div>
  )
}
