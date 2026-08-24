'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { registerWithEmail } from '@/lib/auth/firebase-auth'
import { initSession } from '@/lib/auth/session'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth.schema'
import { User, Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'

export function RegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterInput>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (field: keyof RegisterInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    setServerError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const result = registerSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterInput
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const user = await registerWithEmail(formData.name, formData.email, formData.password)
      // Initialize 7-day session
      initSession(user.uid)
      router.push('/dashboard')
    } catch (err: unknown) {
      console.error('[auth] Register error:', err)
      const firebaseError = err as { code?: string; message?: string }
      if (firebaseError.code === 'auth/email-already-in-use') {
        setServerError('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.')
      } else if (firebaseError.code === 'auth/weak-password') {
        setServerError('Kata sandi terlalu lemah. Gunakan minimal 6 karakter.')
      } else {
        setServerError(firebaseError.message || 'Gagal mendaftar. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#1a1d27]/90 border border-slate-200 dark:border-[#2d3348] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Mulai Bebas Finansial
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Buat akun SaveMe baru secara gratis dalam 30 detik
        </p>
      </div>

      {serverError && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-xs sm:text-sm text-red-700 dark:text-red-300 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Nama Lengkap" required error={errors.name}>
          <Input
            placeholder="Contoh: Budi Santoso"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            disabled={loading}
            error={errors.name}
          />
        </FormField>

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

        <FormField label="Konfirmasi Kata Sandi" required error={errors.confirmPassword}>
          <Input
            isPassword
            placeholder="Ketik ulang kata sandi"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            disabled={loading}
            error={errors.confirmPassword}
          />
        </FormField>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 py-1">
          <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          <span>Data dienkripsi dan diisolasi dengan standar keamanan Firebase.</span>
        </div>

        <Button
          type="submit"
          variant="glow"
          size="lg"
          loading={loading}
          className="w-full mt-2 justify-center text-sm font-semibold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Daftar Akun Baru
        </Button>
      </form>

      {/* Login redirect link */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-[#2d3348]/70 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        Sudah punya akun SaveMe?{' '}
        <Link href="/login" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold hover:underline">
          Masuk di Sini
        </Link>
      </div>
    </div>
  )
}
