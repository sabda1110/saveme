import React from 'react'
import { Label } from '@/components/atoms/Label'
import { cn } from '@/lib/utils/cn'

export interface FormFieldProps {
  id?: string
  label?: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <span className="text-xs text-red-400 font-medium flex items-center gap-1 mt-0.5">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-slate-500 mt-0.5">{hint}</span>
      ) : null}
    </div>
  )
}
