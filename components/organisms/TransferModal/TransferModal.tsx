'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { walletService } from '@/lib/services/wallet.firebase'
import type { Wallet, TransferWalletDto } from '@/types'
import {
  ArrowRightLeft,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface TransferModalProps {
  isOpen: boolean
  wallets: Wallet[]
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export function TransferModal({
  isOpen,
  wallets,
  userId,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '')
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || '')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const fromWallet = wallets.find((w) => w.id === fromWalletId)
  const toWallet = wallets.find((w) => w.id === toWalletId)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Nominal transfer harus lebih besar dari Rp 0')
      return
    }

    if (fromWalletId === toWalletId) {
      setError('Kantong asal dan kantong tujuan tidak boleh sama')
      return
    }

    if (fromWallet && fromWallet.balance < numAmount) {
      setError(`Saldo di ${fromWallet.name} (${formatRupiah(fromWallet.balance)}) tidak mencukupi untuk transfer`)
      return
    }

    setLoading(true)
    try {
      const payload: TransferWalletDto = {
        fromWalletId,
        toWalletId,
        amount: numAmount,
        notes: notes.trim() || undefined,
        date,
      }

      await walletService.transferBetweenWallets(userId, payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('[transfer] Error processing transfer:', err)
      const errObj = err as { message?: string }
      setError(errObj.message || 'Gagal memproses transfer antar kantong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#1a1d27] border border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 border-b border-[#2d3348]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Transfer Antar Kantong
              </h3>
              <span className="text-[11px] text-slate-400">
                Pindahkan saldo antar rekening / e-wallet tanpa mengubah total kas
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#21263a]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleTransfer} className="flex flex-col gap-4">
          {/* From and To Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* From Wallet */}
            <FormField label="Dari Kantong (Sumber)" required>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full bg-[#21263a] text-slate-100 rounded-xl px-4 py-3 text-xs sm:text-sm border border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
                required
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </FormField>

            {/* To Wallet */}
            <FormField label="Ke Kantong (Tujuan)" required>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="w-full bg-[#21263a] text-slate-100 rounded-xl px-4 py-3 text-xs sm:text-sm border border-[#2d3348] focus:border-green-500 focus:outline-none cursor-pointer"
                required
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Amount */}
          <FormField label="Nominal Transfer (Rp)" required>
            <Input
              type="number"
              placeholder="Contoh: 250000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </FormField>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Tanggal Transfer" required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Catatan / Keperluan (Opsional)">
              <Input
                placeholder="Contoh: Top Up GoPay / Tarik ATM"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>

          {/* Transfer Summary Preview Box */}
          {fromWallet && toWallet && fromWalletId !== toWalletId && Number(amount) > 0 && (
            <div className="p-3.5 rounded-xl bg-[#21263a]/60 border border-[#2d3348] flex items-center justify-between text-xs text-slate-300 mt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <span>{fromWallet.icon} {fromWallet.name}</span>
                <span className="text-blue-400 font-bold">➔</span>
                <span>{toWallet.icon} {toWallet.name}</span>
              </div>
              <span className="font-mono font-bold text-white">
                {formatRupiah(Number(amount))}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d3348] mt-2">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="glow"
              size="md"
              loading={loading}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Konfirmasi Transfer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
