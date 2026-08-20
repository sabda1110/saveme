'use client'

import React, { useState } from 'react'
import { quickTemplateService } from '@/lib/services/quick-template.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import type { QuickTemplate, Category, Wallet, CreateQuickTemplateDto } from '@/types'
import {
  Sparkles,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const COMMON_TEMPLATE_ICONS = ['🚬', '🅿️', '☕', '🍛', '⛽', '🥤', '🥐', '🍔', '🛒', '🎮', '💊', '🧼', '⚡', '📦']

export interface ManageTemplatesModalProps {
  isOpen: boolean
  userId: string
  templates: QuickTemplate[]
  categories: Category[]
  wallets: Wallet[]
  onClose: () => void
  onSuccess: () => void
}

export function ManageTemplatesModal({
  isOpen,
  userId,
  templates,
  categories,
  wallets,
  onClose,
  onSuccess,
}: ManageTemplatesModalProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<QuickTemplate | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [icon, setIcon] = useState('🚬')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'other')
  const [walletId, setWalletId] = useState(wallets[0]?.id || '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Delete Confirm State
  const [templateToDelete, setTemplateToDelete] = useState<QuickTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen) return null

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleOpenAdd = () => {
    setEditingTemplate(null)
    setName('')
    setAmount('')
    setIcon('⚡')
    setCategoryId(categories[0]?.id || 'other')
    setWalletId(wallets[0]?.id || '')
    setError(null)
    setIsAdding(true)
  }

  const handleOpenEdit = (t: QuickTemplate) => {
    setEditingTemplate(t)
    setName(t.name)
    setAmount(t.amount.toString())
    setIcon(t.icon)
    setCategoryId(t.categoryId)
    setWalletId(t.walletId || wallets[0]?.id || '')
    setError(null)
    setIsAdding(true)
  }

  const handleCancelForm = () => {
    setIsAdding(false)
    setEditingTemplate(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nama template wajib diisi')
      return
    }

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Nominal harus lebih besar dari 0')
      return
    }

    const selectedCat = categories.find((c) => c.id === categoryId) || {
      id: 'other',
      name: 'Other',
      icon: '📦',
    }
    const selectedWallet = wallets.find((w) => w.id === walletId)

    setLoading(true)
    try {
      if (editingTemplate) {
        // UPDATE
        await quickTemplateService.updateTemplate(userId, editingTemplate.id, {
          name: name.trim(),
          amount: numAmount,
          icon,
          categoryId: selectedCat.id,
          categoryName: selectedCat.name,
          categoryIcon: selectedCat.icon,
          walletId: selectedWallet?.id || '',
          walletName: selectedWallet?.name || '',
        })
      } else {
        // CREATE
        const payload: CreateQuickTemplateDto = {
          name: name.trim(),
          amount: numAmount,
          icon,
          categoryId: selectedCat.id,
          categoryName: selectedCat.name,
          categoryIcon: selectedCat.icon,
          walletId: selectedWallet?.id || '',
          walletName: selectedWallet?.name || '',
        }
        await quickTemplateService.createTemplate(userId, payload)
      }

      setIsAdding(false)
      setEditingTemplate(null)
      onSuccess()
    } catch (err: unknown) {
      console.error('[ManageTemplatesModal] Error saving template:', err)
      const errObj = err as { message?: string }
      setError(errObj.message || 'Gagal menyimpan template')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return
    setDeleting(true)
    try {
      await quickTemplateService.deleteTemplate(userId, templateToDelete.id)
      setTemplateToDelete(null)
      onSuccess()
    } catch (err) {
      console.error('[ManageTemplatesModal] Error deleting template:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#1a1d27] border border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2d3348]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Kelola Template Catat Cepat
              </h3>
              <p className="text-[11px] text-slate-400">
                Atur nominal rokok/vape, parkir, kopi, dan kebutuhan rutin lainnya
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#21263a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add / Edit Form Mode */}
        {isAdding ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d3348]">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {editingTemplate ? 'Edit Template' : 'Tambah Template Baru'}
              </span>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Icon Picker */}
            <FormField label="Pilih Ikon Emoji">
              <div className="flex flex-wrap gap-2">
                {COMMON_TEMPLATE_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      'w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer',
                      icon === emoji
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md scale-110'
                        : 'bg-[#21263a] border-[#2d3348] hover:border-slate-500'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Nama Pengeluaran" required>
              <Input
                placeholder="Contoh: Rokok Surya / Parkir Motor / Kopi Pagi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Nominal Harga (Rp)" required>
              <Input
                type="number"
                placeholder="Contoh: 35000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Kategori Transaksi">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#21263a] text-slate-100 rounded-xl px-3.5 py-3 text-sm border border-[#2d3348] focus:outline-none focus:border-amber-500"
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
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full bg-[#21263a] text-slate-100 rounded-xl px-3.5 py-3 text-sm border border-[#2d3348] focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih Kantong (Opsional) --</option>
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d3348]">
              <Button type="button" variant="ghost" size="md" onClick={handleCancelForm}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="glow"
                size="md"
                loading={loading}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                {editingTemplate ? 'Simpan Perubahan' : 'Buat Template'}
              </Button>
            </div>
          </form>
        ) : (
          /* Template List View */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {templates.length} Template Aktif
              </span>
              <Button
                variant="glow"
                size="sm"
                onClick={handleOpenAdd}
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="text-xs"
              >
                Tambah Template
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="p-8 text-center bg-[#21263a]/50 rounded-2xl border border-[#2d3348]">
                <span className="text-3xl mb-2 block">⚡</span>
                <p className="text-sm font-bold text-white">Belum Ada Template</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Buat template cepat untuk rokok, parkir, kopi, dll.
                </p>
                <Button variant="glow" size="sm" onClick={handleOpenAdd}>
                  Tambah Template Pertama
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3.5 rounded-xl bg-[#21263a] border border-[#2d3348] hover:border-amber-500/40 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl w-9 h-9 rounded-xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-center shrink-0">
                        {tpl.icon}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">
                          {tpl.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-extrabold font-mono text-amber-400">
                            {formatRupiah(tpl.amount)}
                          </span>
                          {tpl.walletName && (
                            <span className="text-[10px] text-slate-400 bg-[#1a1d27] px-1.5 py-0.5 rounded border border-[#2d3348]">
                              {tpl.walletName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1d27] transition-colors"
                        title="Edit Template"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateToDelete(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#1a1d27] transition-colors"
                        title="Hapus Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#2d3348] flex justify-end">
              <Button variant="secondary" size="md" onClick={onClose}>
                Tutup
              </Button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={Boolean(templateToDelete)}
          title="Hapus Template Cepat?"
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
    </div>
  )
}
