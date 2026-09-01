'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import { Button } from '@/components/atoms/Button'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, Menu, X, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navLinks = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Keunggulan', href: '#keunggulan' },
]

export function Navbar() {
  const { user, userProfile } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-[#0a0a0f]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/8 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <BrandLogo size="md" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle size="sm" />
            {user ? (
              <Link href="/dashboard">
                <Button
                  variant="glow"
                  size="sm"
                  leftIcon={<LayoutDashboard className="w-4 h-4" />}
                >
                  {userProfile?.name ? `Hai, ${userProfile.name.split(' ')[0]}` : 'Dashboard'}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="glow" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Mulai Gratis
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle size="sm" />
            {user ? (
              <Link href="/dashboard">
                <Button variant="glow" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button variant="glow" size="sm">Mulai</Button>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="rounded-2xl bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 p-3 flex flex-col gap-1 shadow-lg">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  {link.label}
                </a>
              ))}
              {!user && (
                <div className="pt-2 mt-1 border-t border-slate-100 dark:border-white/8 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="secondary" size="md" className="w-full justify-center">Masuk</Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button variant="glow" size="md" className="w-full justify-center">Mulai Sekarang — Gratis</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
