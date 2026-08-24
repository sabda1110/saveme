'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, Menu, X, Sparkles, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function Navbar() {
  const { user, userProfile } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Fitur Unggulan', href: '#fitur' },
    { label: 'Simulator Finansial', href: '#simulator', isHighlight: true },
    { label: 'Live Preview', href: '#preview' },
    { label: 'Privasi & Keamanan', href: '#keamanan' },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 dark:bg-[#0f1117]/85 backdrop-blur-md border-b border-slate-200 dark:border-[#2d3348]/80 py-3 shadow-md dark:shadow-xl'
          : 'bg-transparent py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <Badge variant="brand" size="sm" className="hidden sm:inline-flex" dot>
              v2.0 AI-Powered
            </Badge>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors duration-150 relative group',
                  link.isHighlight
                    ? 'text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {link.isHighlight && <Sparkles className="w-3.5 h-3.5 text-green-500 dark:text-green-400 animate-pulse" />}
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-500 transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle size="sm" />

            {user ? (
              <Link href="/dashboard">
                <Button
                  variant="glow"
                  size="sm"
                  leftIcon={<LayoutDashboard className="w-4 h-4" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Buka Dashboard {userProfile?.name ? `(${userProfile.name.split(' ')[0]})` : ''}
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
                  <Button variant="glow" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Mulai Gratis
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle size="sm" />

            {user ? (
              <Link href="/dashboard">
                <Button variant="glow" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button variant="glow" size="sm">
                  Mulai
                </Button>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] border border-slate-200 dark:border-[#2d3348] transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 hover:bg-slate-100 dark:hover:bg-[#21263a] rounded-lg transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                {link.isHighlight && <Badge variant="brand" size="sm">Coba Sekarang</Badge>}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-200 dark:border-[#2d3348] flex flex-col gap-2">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="glow" size="md" className="w-full justify-center">
                    Buka Dashboard Saya
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" size="md" className="w-full justify-center">
                      Masuk ke Akun
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="glow" size="md" className="w-full justify-center">
                      Daftar Akun Baru
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
