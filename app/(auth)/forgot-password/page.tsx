import { Suspense } from 'react'
import { AuthTemplate } from '@/components/templates/AuthTemplate'
import { ForgotPasswordForm } from '@/components/organisms/ForgotPasswordForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lupa Kata Sandi — SaveMe',
  description: 'Atur ulang kata sandi akun SaveMe Anda dengan aman melalui email.',
}

export default function ForgotPasswordPage() {
  return (
    <AuthTemplate>
      <Suspense fallback={<div className="w-full max-w-md h-80 rounded-2xl bg-white dark:bg-[#1a1d27]/50 border border-slate-200 dark:border-[#2d3348] animate-pulse" />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthTemplate>
  )
}
