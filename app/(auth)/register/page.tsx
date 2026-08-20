import { AuthTemplate } from '@/components/templates/AuthTemplate'
import { RegisterForm } from '@/components/organisms/RegisterForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Daftar Akun Baru — SaveMe',
  description: 'Daftar akun SaveMe gratis untuk memulai pencatatan keuangan pribadi.',
}

export default function RegisterPage() {
  return (
    <AuthTemplate>
      <RegisterForm />
    </AuthTemplate>
  )
}
