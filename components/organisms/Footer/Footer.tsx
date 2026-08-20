'use client'

import React from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import { Badge } from '@/components/atoms/Badge'

export function Footer() {
  return (
    <footer className="border-t border-[#2d3348] bg-[#0c0e14] py-12 sm:py-16 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <BrandLogo size="md" />
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Aplikasi pencatat keuangan pribadi yang simpel, modern, dan menjunjung tinggi
              privasi datamu.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="neutral" size="sm">
                Next.js 16
              </Badge>
              <Badge variant="neutral" size="sm">
                PostgreSQL
              </Badge>
              <Badge variant="neutral" size="sm">
                Prisma ORM
              </Badge>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Navigasi</h4>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href="#fitur" className="hover:text-green-400 transition-colors">
                  Fitur Unggulan
                </a>
              </li>
              <li>
                <a href="#simulator" className="hover:text-green-400 transition-colors">
                  Simulator Finansial
                </a>
              </li>
              <li>
                <a href="#preview" className="hover:text-green-400 transition-colors">
                  Live Preview App
                </a>
              </li>
              <li>
                <a href="#keamanan" className="hover:text-green-400 transition-colors">
                  Privasi & Keamanan
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Akses Akun */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Akses Akun</h4>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-green-400 transition-colors">
                  Masuk Akun
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-green-400 transition-colors">
                  Daftar Akun Baru
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#2d3348]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SaveMe. Seluruh hak cipta dilindungi.</p>
          <p className="flex items-center gap-1.5">
            <span>Dibuat dengan dedikasi untuk kebebasan finansial</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
