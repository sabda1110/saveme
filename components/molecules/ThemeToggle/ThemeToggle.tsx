'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function ThemeToggle({
  className,
  size = 'md',
  showLabel = false,
}: ThemeToggleProps) {
  const { toggleTheme, isDark } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/30',
        size === 'sm' ? 'p-1.5 text-xs' : 'p-2 sm:px-3 text-xs sm:text-sm',
        isDark
          ? 'bg-[#21263a] hover:bg-[#2d3348] text-amber-300 border border-[#2d3348]'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm',
        className
      )}
      title={isDark ? 'Ganti ke Light Mode (Mode Terang)' : 'Ganti ke Dark Mode (Mode Gelap)'}
      aria-label="Toggle tema tampilan"
    >
      <div className="relative w-4 h-4 sm:w-4.5 sm:h-4.5 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>

      {showLabel && (
        <span className="font-semibold select-none">
          {isDark ? 'Mode Terang' : 'Mode Gelap'}
        </span>
      )}
    </button>
  )
}
