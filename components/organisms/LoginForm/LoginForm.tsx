'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { loginWithEmail } from '@/lib/auth/firebase-auth'
import { initSession } from '@/lib/auth/session'
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { Mail, Lock, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSessionExpired = searchParams.get('sessionExpired') === 'true'

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (field: keyof LoginInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    setServerError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const result = loginSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginInput
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const user = await loginWithEmail(formData.email, formData.password)
      // Initialize 7-day session
      initSession(user.uid)
      router.push('/dashboard')
    } catch (err: unknown) {
      console.error('[auth] Login error:', err)
      const firebaseError = err as { code?: string }
      if (
        firebaseError.code === 'auth/invalid-credential' ||
        firebaseError.code === 'auth/user-not-found' ||
        firebaseError.code === 'auth/wrong-password'
      ) {
        setServerError('Email atau kata sandi tidak cocok.')
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setServerError('Terlalu banyak percobaan gagal. Silakan coba lagi nanti.')
      } else {
        setServerError('Gagal masuk. Periksa koneksi internet Anda.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-[#1a1d27]/90 border border-[#2d3348] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Selamat Datang Kembali
        </h2>
        <p className="text-sm text-slate-400">
          Masuk ke akun SaveMe untuk mengelola keuanganmu
        </p>
      </div>

      {isSessionExpired && !serverError && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs sm:text-sm text-amber-200 animate-in fade-in">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-bold text-amber-300">Sesi Login Telah Berakhir</span>
            <span className="text-[11px] sm:text-xs text-amber-200/80 mt-0.5">
              Demi keamanan data finansial Anda, sesi aktif dibatasi selama 7 hari. Silakan masuk kembali.
            </span>
          </div>
        </div>
      )}

      {serverError && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-xs sm:text-sm text-red-300 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
        <FormField label="Alamat Email" required error={errors.email}>
          <Input
            type="email"
            placeholder="nama@email.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            disabled={loading}
            error={errors.email}
          />
        </FormField>

        <FormField label="Kata Sandi" required error={errors.password}>
          <Input
            isPassword
            placeholder="Minimal 6 karakter"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            disabled={loading}
            error={errors.password}
          />
        </FormField>

        <Button
          type="submit"
          variant="glow"
          size="lg"
          loading={loading}
          className="w-full mt-2 justify-center text-sm font-semibold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Masuk Sekarang
        </Button>
      </form>

      {/* Register redirect link */}
      <div className="mt-8 pt-6 border-t border-[#2d3348]/70 text-center text-xs sm:text-sm text-slate-400">
        Belum punya akun SaveMe?{' '}
        <Link href="/register" className="text-green-400 hover:text-green-300 font-semibold hover:underline">
          Daftar Gratis
        </Link>
      </div>
    </div>
  )
}
