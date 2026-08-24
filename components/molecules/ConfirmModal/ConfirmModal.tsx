'use client'

import React from 'react'
import { AlertTriangle, Trash2, X, Info } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils/cn'

export interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-500 dark:text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />
      default:
        return <Info className="w-6 h-6 text-blue-500 dark:text-blue-400" />
    }
  }

  const getIconBg = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Glow ambient */}
        <div
          className={cn(
            'absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none',
            variant === 'danger'
              ? 'bg-red-500/10'
              : variant === 'warning'
              ? 'bg-amber-500/10'
              : 'bg-blue-500/10'
          )}
        />

        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 shadow-inner',
              getIconBg()
            )}
          >
            {getIcon()}
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>

          {description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed mb-6">
              {description}
            </p>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={loading}
              onClick={onClose}
            >
              {cancelText}
            </Button>

            <Button
              type="button"
              variant="danger"
              size="md"
              loading={loading}
              onClick={onConfirm}
              className={cn(
                variant === 'warning' &&
                  'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white dark:text-slate-950 font-bold'
              )}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
