'use client'

import React from 'react'
import { useToast } from '@/context/ToastContext'
import { ToastItem } from '@/components/molecules/Toast'

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (!toasts || toasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] pointer-events-none flex flex-col gap-2.5 items-end max-w-[calc(100vw-2rem)] sm:max-w-md w-full"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
