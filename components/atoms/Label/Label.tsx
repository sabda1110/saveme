import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({
  className,
  required,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn('text-xs sm:text-sm font-medium text-slate-300 flex items-center gap-1', className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-400 font-bold">*</span>}
    </label>
  )
}
