'use client'

import React from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/atoms/BrandLogo'

const PRODUCT_LINKS = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Keunggulan', href: '#keunggulan' },
]

const ACCOUNT_LINKS = [
  { label: 'Masuk Akun', href: '/login', external: false },
  { label: 'Daftar Gratis', href: '/register', external: false },
]

const LEGAL_LINKS = [
  { label: 'Kebijakan Privasi', href: '#' },
  { label: 'Syarat & Ketentuan', href: '#' },
]

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-white/8 bg-white dark:bg-[#0a0a0f] py-14 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-12">
          {/* Brand col */}
          <div className="sm:col-span-2 flex flex-col gap-4">
            <BrandLogo size="md" withLink={false} />
            <p className="text-sm text-slate-500 dark:text-slate-500 max-w-xs leading-relaxed">
              Aplikasi pengelola keuangan pribadi yang simpel, privat, dan modern untuk semua orang. Catat pengeluaran, amankan tabungan, dan raih kebebasan finansial.
            </p>
          </div>

          {/* Product col */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Navigasi</h4>
            <ul className="flex flex-col gap-2">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal col */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Legal &amp; Privasi</h4>
            <ul className="flex flex-col gap-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-100 dark:border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-600">
          <p>© {new Date().getFullYear()} SaveMe. Seluruh hak cipta dilindungi.</p>
          <p>Dibuat dengan dedikasi untuk kebiasaan finansial yang lebih baik.</p>
        </div>
      </div>
    </footer>
  )
}
