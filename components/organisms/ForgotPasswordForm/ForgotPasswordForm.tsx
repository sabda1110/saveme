'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { resetPassword } from '@/lib/auth/firebase-auth'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth.schema'
import { useToast } from '@/context/ToastContext'
import { KeyRound, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const { toast } = useToast()

  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer for resending
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      const msg = result.error.issues[0]?.message || 'Format email tidak valid'
      setError(msg)
      toast.error(msg)
      return
    }

    setLoading(true)
    try {
      await resetPassword(email)
      setIsSubmitted(true)
      setCooldown(30)
      toast.success('Tautan reset kata sandi telah dikirim ke email Anda!', {
        title: 'Tautan Terkirim',
      })
    } catch (err: unknown) {
      console.error('[auth] Reset password error:', err)
      const firebaseError = err as { code?: string; message?: string }
      let msg = 'Gagal mengirim email reset. Periksa koneksi internet Anda.'
      if (firebaseError.code === 'auth/invalid-email') {
        msg = 'Format alamat email tidak valid.'
      } else if (firebaseError.code === 'auth/user-not-found') {
        msg = 'Alamat email ini tidak terdaftar di SaveMe.'
      } else if (firebaseError.code === 'auth/too-many-requests') {
        msg = 'Terlalu banyak permintaan reset. Harap coba lagi dalam beberapa menit.'
      }
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Success view after email is sent
  if (isSubmitted) {
    return (
      <div className="w-full max-w-md bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-colors text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-5 shadow-md shadow-green-500/10">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Periksa Email Anda
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          Tautan reset kata sandi telah dikirimkan ke:
          <span className="block font-semibold text-slate-900 dark:text-white mt-1 text-sm bg-slate-100 dark:bg-[#21263a] py-1.5 px-3 rounded-xl border border-slate-200 dark:border-[#2d3348] break-all">
            {email}
          </span>
          Silakan periksa kotak masuk (*inbox*) atau folder spam Anda untuk membuat kata sandi baru.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={cooldown > 0 || loading}
            loading={loading}
            onClick={() => handleSubmit()}
            className="w-full justify-center text-xs font-semibold"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {cooldown > 0 ? `Kirim Ulang Email (${cooldown}s)` : 'Kirim Ulang Tautan Reset'}
          </Button>

          <Link href="/login" className="w-full">
            <Button
              type="button"
              variant="glow"
              size="md"
              className="w-full justify-center text-xs font-semibold"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Kembali ke Halaman Masuk
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-colors">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1.5">
          Lupa Kata Sandi?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan resmi untuk membuat kata sandi baru Anda.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Alamat Email Terdaftar" required error={error || undefined}>
          <Input
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            leftIcon={<Mail className="w-4 h-4" />}
            disabled={loading}
            error={error || undefined}
          />
        </FormField>

        <Button
          type="submit"
          variant="glow"
          size="lg"
          loading={loading}
          disabled={loading || !email.trim()}
          className="w-full mt-2 justify-center text-sm font-semibold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Kirim Tautan Reset
        </Button>
      </form>

      {/* Back to login redirect */}
      <div className="mt-7 pt-5 border-t border-slate-200 dark:border-[#2d3348]/70 text-center text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
        <span>Ingat kata sandi Anda?</span>
        <Link
          href="/login"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold hover:underline"
        >
          Masuk di Sini
        </Link>
      </div>
    </div>
  )
}
