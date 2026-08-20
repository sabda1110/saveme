import React from 'react'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils/cn'

export interface MockTransactionProps {
  category: string
  icon: string
  description: string
  date: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  className?: string
}

export function MockTransaction({
  category,
  icon,
  description,
  date,
  amount,
  type,
  className,
}: MockTransactionProps) {
  const isIncome = type === 'INCOME'

  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3.5 rounded-xl bg-[#21263a]/70 hover:bg-[#21263a] border border-[#2d3348]/70 transition-colors duration-150',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#1a1d27] border border-[#2d3348] flex items-center justify-center text-lg shrink-0 shadow-inner">
          {icon}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100 truncate">
              {description || category}
            </span>
            <Badge variant={isIncome ? 'income' : 'expense'} size="sm">
              {category}
            </Badge>
          </div>
          <span className="text-xs text-slate-400 mt-0.5">{date}</span>
        </div>
      </div>

      <div className="text-right shrink-0 pl-3">
        <span
          className={cn(
            'text-sm sm:text-base font-bold font-mono tabular-nums tracking-tight',
            isIncome ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isIncome ? `+${formattedAmount}` : `-${formattedAmount}`}
        </span>
      </div>
    </div>
  )
}
