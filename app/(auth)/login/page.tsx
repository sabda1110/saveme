import { Suspense } from 'react'
import { AuthTemplate } from '@/components/templates/AuthTemplate'
import { LoginForm } from '@/components/organisms/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masuk — SaveMe',
  description: 'Masuk ke akun SaveMe untuk mengelola keuangan pribadimu.',
}

export default function LoginPage() {
  return (
    <AuthTemplate>
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-2xl bg-[#1a1d27]/50 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </AuthTemplate>
  )
}
