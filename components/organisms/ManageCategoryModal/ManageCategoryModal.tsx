'use client'

import React, { useState, useEffect } from 'react'
import { categoryService, type CustomCategoryInput } from '@/lib/services/category.firebase'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import type { Category, CategoryType } from '@/types'
import { X, CheckCircle2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const PRESET_ICONS = [
  '📱', '💄', '🐾', '🎮', '🧺', '🧋', '🛵', '🍕',
  '🎁', '👶', '⚽', '📚', '🛠️', '💡', '🏷️', '👕',
  '💊', '🏖️', '🍿', '🚗', '☕', '💼', '🛒', '⚡',
]

export interface ManageCategoryModalProps {
  isOpen: boolean
  userId: string
  categoryToEdit?: Category | null
  defaultType?: CategoryType
  onClose: () => void
  onSuccess: (category?: Category) => void
}

export function ManageCategoryModal({
  isOpen,
  userId,
  categoryToEdit,
  defaultType = 'EXPENSE',
  onClose,
  onSuccess,
}: ManageCategoryModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏷️')
  const [type, setType] = useState<CategoryType>(defaultType)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name)
      setIcon(categoryToEdit.icon || '🏷️')
      setType(categoryToEdit.type || 'EXPENSE')
    } else {
      setName('')
      setIcon('🏷️')
      setType(defaultType)
    }
    setError(null)
  }, [categoryToEdit, defaultType, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Nama kategori wajib diisi')
      return
    }

    setLoading(true)
    try {
      if (categoryToEdit) {
        await categoryService.updateCustomCategory(userId, categoryToEdit.id, {
          name: trimmedName,
          icon: icon.trim() || '🏷️',
          type,
        })
        onSuccess({
          ...categoryToEdit,
          name: trimmedName,
          icon: icon.trim() || '🏷️',
          type,
        })
      } else {
        const created = await categoryService.createCustomCategory(userId, {
          name: trimmedName,
          icon: icon.trim() || '🏷️',
          type,
        })
        onSuccess(created)
      }
      onClose()
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setError(errObj.message || 'Gagal menyimpan kategori')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200 text-slate-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {categoryToEdit ? 'Edit Kategori' : 'Kategori Baru'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tentukan nama, simbol ikon, dan jenis kategori
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <FormField label="Nama Kategori" required>
            <Input
              placeholder="Contoh: Pulsa & Kuota, Skincare, Anabul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </FormField>

          <FormField label="Jenis Kategori">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'EXPENSE', label: 'Pengeluaran' },
                { id: 'INCOME', label: 'Pemasukan' },
                { id: 'BOTH', label: 'Keduanya' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as CategoryType)}
                  className={cn(
                    'py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center',
                    type === item.id
                      ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-white'
                      : 'bg-slate-50 dark:bg-[#21263a] border-slate-200 dark:border-[#2d3348] text-slate-600 dark:text-slate-300 hover:border-slate-400'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Simbol / Ikon">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] flex items-center justify-center text-2xl shrink-0">
                {icon || '🏷️'}
              </span>
              <Input
                placeholder="Ketik simbol / emoji"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="text-center font-mono text-lg"
              />
            </div>

            <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 dark:bg-[#131620]/60 border border-slate-200 dark:border-[#2d3348] rounded-xl max-h-32 overflow-y-auto">
              {PRESET_ICONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIcon(preset)}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-base hover:scale-110 transition-transform cursor-pointer',
                    icon === preset
                      ? 'bg-green-500/20 border border-green-500'
                      : 'hover:bg-slate-200 dark:hover:bg-[#21263a]'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#2d3348]">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="glow"
              size="md"
              loading={loading}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {categoryToEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
