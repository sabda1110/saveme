'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { adminService } from '@/lib/services/admin.firebase'
import { categoryService } from '@/lib/services/category.firebase'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import {
  ShieldAlert,
  Users,
  ReceiptText,
  DollarSign,
  UserCheck,
  RotateCcw,
  Database,
} from 'lucide-react'
import type { UserProfile, UserRole, SystemStats } from '@/types'

export default function AdminConsolePage() {
  const router = useRouter()
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [usersList, setUsersList] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    let isMounted = true

    if (!authLoading && !isAdmin) {
      router.push('/dashboard')
      return
    }

    async function loadData() {
      if (!user?.uid) return
      setLoading(true)

      try {
        const statsData = await adminService.getSystemStats(user.uid)
        const users = await adminService.getAllUsers(user.uid)

        if (isMounted) {
          setStats(statsData)
          setUsersList(users)
        }
      } catch (err: unknown) {
        console.error('[admin] Error loading stats:', err)
        const errorObj = err as { message?: string }
        if (isMounted) {
          setActionMessage(errorObj.message || 'Gagal memuat data admin')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (isAdmin && user?.uid) {
      loadData()
    }

    return () => {
      isMounted = false
    }
  }, [isAdmin, authLoading, user?.uid, router, refreshTrigger])

  // Seed Confirm Modal State
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    if (!user?.uid) return
    if (!isSuperAdmin) {
      alert('Hanya Super Admin yang dapat mengubah hak akses pengguna!')
      return
    }

    try {
      await adminService.updateUserRole(user.uid, targetUid, newRole)
      setActionMessage(`Sukses mengubah role user ke ${newRole}`)
      setRefreshTrigger((p) => p + 1)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      alert(errorObj.message || 'Gagal mengubah role')
    }
  }

  const handleConfirmSeedCategories = async () => {
    setIsSeeding(true)
    try {
      await categoryService.seedCategories()
      setActionMessage('Kategori sistem berhasil di-seed ke Firestore!')
      setIsSeedConfirmOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      alert(errorObj.message || 'Gagal seed kategori')
    } finally {
      setIsSeeding(false)
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  if (authLoading || (loading && !stats)) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Memuat Admin Console...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Super Admin Console
              </h1>
              <p className="text-xs text-slate-400">
                Pusat kontrol sistem, manajemen hak akses, dan metrik global SaveMe
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSeedConfirmOpen(true)}
            leftIcon={<Database className="w-3.5 h-3.5" />}
          >
            Seed 10 Kategori
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3 Global Platform Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pengguna</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white tabular-nums">
            {stats?.totalUsers || 0}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Akun terdaftar di Firestore</span>
        </div>

        <div className="p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Transaksi</span>
            <ReceiptText className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-green-400 tabular-nums">
            {stats?.totalTransactions || 0}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Seluruh data pengguna</span>
        </div>

        <div className="p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Volume Dana</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-300 tabular-nums">
            {formatRupiah(stats?.totalVolume || 0)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Akumulasi seluruh perputaran</span>
        </div>
      </div>

      {/* User Management & RBAC Table */}
      <div className="p-6 rounded-2xl bg-[#1a1d27] border border-[#2d3348] shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2d3348]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Manajemen Pengguna & Hak Akses ({usersList.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {isSuperAdmin ? 'Mode Super Admin: Dapat Mengubah Role' : 'Mode Admin: Read-Only'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2d3348] text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3 font-semibold">Pengguna</th>
                <th className="pb-3 px-3 font-semibold">Email</th>
                <th className="pb-3 px-3 font-semibold">Role Saat Ini</th>
                <th className="pb-3 px-3 font-semibold text-right">Aksi Kelola Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3348]/60">
              {usersList.map((usr) => (
                <tr key={usr.uid} className="hover:bg-[#21263a]/40 transition-colors">
                  <td className="py-3.5 px-3 font-medium text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-[11px]">
                        {usr.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span>{usr.name || 'Pengguna'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">{usr.email}</td>
                  <td className="py-3.5 px-3">
                    <Badge
                      variant={
                        usr.role === 'SUPER_ADMIN'
                          ? 'brand'
                          : usr.role === 'ADMIN'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {usr.role || 'USER'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {isSuperAdmin && usr.uid !== user?.uid ? (
                      <div className="inline-flex gap-1.5 justify-end">
                        {usr.role !== 'USER' && (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(usr.uid, 'USER')}
                            className="px-2 py-1 rounded bg-[#21263a] hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-[#2d3348]"
                          >
                            Set USER
                          </button>
                        )}
                        {usr.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(usr.uid, 'ADMIN')}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold border border-amber-500/40"
                          >
                            Set ADMIN
                          </button>
                        )}
                        {usr.role !== 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(usr.uid, 'SUPER_ADMIN')}
                            className="px-2 py-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 text-[10px] font-semibold border border-green-500/40"
                          >
                            Set SUPER_ADMIN
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">
                        {usr.uid === user?.uid ? 'Akun Anda Sendiri' : 'Terkunci'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Confirmation Modal for Seeding Categories */}
      <ConfirmModal
        isOpen={isSeedConfirmOpen}
        title="Seed 10 Kategori Default?"
        description="Aksi ini akan mendaftarkan 10 kategori transaksi standar ke dalam koleksi Firestore jika belum tersedia."
        confirmText="Seed Sekarang"
        cancelText="Batal"
        variant="warning"
        loading={isSeeding}
        onConfirm={handleConfirmSeedCategories}
        onClose={() => setIsSeedConfirmOpen(false)}
      />
    </div>
  )
}
