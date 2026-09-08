'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/molecules/FormField'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { registerWithEmail, signInWithGoogle } from '@/lib/auth/firebase-auth'
import { initSession } from '@/lib/auth/session'
import { notificationService } from '@/lib/services/notification.firebase'
import { useToast } from '@/context/ToastContext'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth.schema'
import { GoogleIcon } from '@/components/atoms/GoogleIcon'
import { User, Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'

export function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState<RegisterInput>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

      // Direct native browser notification permission prompt on register gesture
      try {
        const notifResult = await notificationService.promptAndSyncNotification(user.uid)
        if (notifResult.status === 'granted') {
          toast.success(
            'Notifikasi browser aktif! Anda siap menerima briefing pagi jam 07:00 & undangan celengan.'
          )
        } else if (notifResult.status === 'denied') {
          toast.warning(
            'Izin notifikasi diblokir browser. Anda mungkin melewatkan briefing jam 07:00 & undangan celengan. Anda dapat mengaktifkannya di menu Profil.',
            { duration: 6000 }
          )
        } else if (notifResult.status === 'default') {
          toast.info(
            'Notifikasi browser belum diaktifkan. Anda dapat mengaktifkannya kapan saja di menu Profil.',
            { duration: 5000 }
          )
        }
      } catch (notifErr) {
        console.warn('[auth] Error prompting notification on register:', notifErr)
      }

      toast.success('Pendaftaran akun berhasil! Selamat datang di SaveMe.')
      router.push('/dashboard')
    } catch (err: unknown) {
      console.error('[auth] Register error:', err)
      const firebaseError = err as { code?: string; message?: string }
      let msg = firebaseError.message || 'Gagal mendaftar. Silakan coba lagi.'
      if (firebaseError.code === 'auth/email-already-in-use') {
        msg = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
      } else if (firebaseError.code === 'auth/weak-password') {
        msg = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.'
      }
      setServerError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setServerError(null)
    setGoogleLoading(true)
    try {
      const { user } = await signInWithGoogle()
      initSession(user.uid)

      // Direct native browser notification permission prompt on Google register gesture
      try {
        const notifResult = await notificationService.promptAndSyncNotification(user.uid)
        if (notifResult.status === 'granted') {
          toast.success(
            'Notifikasi browser aktif! Anda siap menerima briefing pagi jam 07:00 & undangan celengan.'
          )
        } else if (notifResult.status === 'denied') {
          toast.warning(
            'Izin notifikasi diblokir browser. Anda mungkin melewatkan briefing jam 07:00 & undangan celengan. Anda dapat mengaktifkannya di menu Profil.',
            { duration: 6000 }
          )
        } else if (notifResult.status === 'default') {
          toast.info(
            'Notifikasi browser belum diaktifkan. Anda dapat mengaktifkannya kapan saja di menu Profil.',
            { duration: 5000 }
          )
        }
      } catch (notifErr) {
        console.warn('[auth] Error prompting notification on Google register:', notifErr)
      }

      toast.success('Berhasil masuk dengan akun Google!')
      router.push('/dashboard')
    } catch (err: unknown) {
      console.error('[auth] Google sign-in error:', err)
      const firebaseError = err as { code?: string; message?: string }
      if (
        firebaseError.code === 'auth/popup-closed-by-user' ||
        firebaseError.code === 'auth/cancelled-popup-request'
      ) {
        return
      }
      let msg = firebaseError.message || 'Gagal masuk dengan Google. Silakan coba lagi.'
      if (firebaseError.code === 'auth/popup-blocked') {
        msg = 'Pop-up Google diblokir browser. Harap izinkan pop-up untuk situs ini.'
      } else if (firebaseError.code === 'auth/network-request-failed') {
        msg = 'Gagal terhubung ke Google. Periksa koneksi internet Anda.'
      } else if (firebaseError.code === 'auth/unauthorized-domain') {
        msg = 'Domain deployment ini belum didaftarkan di Firebase Console. Buka Firebase Authentication > Settings > Authorized Domains dan tambahkan domain Vercel Anda.'
      }
      setServerError(msg)
      toast.error(msg, { duration: 6000 })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-colors">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Mulai Bebas Finansial
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
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
            disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
            error={errors.confirmPassword}
          />
        </FormField>

        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 py-1">
          <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          <span>Data dienkripsi dan diisolasi dengan standar keamanan Firebase.</span>
        </div>

        <Button
          type="submit"
          variant="glow"
          size="lg"
          loading={loading}
          disabled={loading || googleLoading}
          className="w-full mt-2 justify-center text-sm font-semibold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Daftar Akun Baru
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-[#2d3348]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-[#1a1d27] px-3 text-slate-400 dark:text-slate-500 font-medium">
            Atau daftar dengan
          </span>
        </div>
      </div>

      {/* Google Sign-in Button */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        loading={googleLoading}
        disabled={loading || googleLoading}
        onClick={handleGoogleSignIn}
        className="w-full justify-center text-sm font-semibold hover:border-slate-300 dark:hover:border-slate-500"
        leftIcon={<GoogleIcon size={18} />}
      >
        Daftar dengan Google
      </Button>

      {/* Login redirect link */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-[#2d3348]/70 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        Sudah punya akun SaveMe?{' '}
        <Link href="/login" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold hover:underline">
          Masuk di Sini
        </Link>
      </div>
    </div>
  )
}
