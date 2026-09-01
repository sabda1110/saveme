'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  Search,
  CheckCircle2,
  Lock,
  ChevronDown,
  Shield,
  Activity,
  Server,
  Sparkles,
} from 'lucide-react'
import type { UserProfile, UserRole, SystemStats } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function AdminConsolePage() {
  const router = useRouter()
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [usersList, setUsersList] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN' | 'SUPER_ADMIN'>('ALL')

  // Role Change Confirmation Modal State
  const [roleChangeModal, setRoleChangeModal] = useState<{
    isOpen: boolean
    targetUid: string
    targetName: string
    targetEmail: string
    currentRole: UserRole
    newRole: UserRole
    loading: boolean
  }>({
    isOpen: false,
    targetUid: '',
    targetName: '',
    targetEmail: '',
    currentRole: 'USER',
    newRole: 'USER',
    loading: false,
  })

  // Category Seed Modal State
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

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
          setActionMessage({ text: errorObj.message || 'Gagal memuat data admin', type: 'error' })
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

  // Count by roles
  const roleCounts = useMemo(() => {
    const counts = { ALL: usersList.length, USER: 0, ADMIN: 0, SUPER_ADMIN: 0 }
    usersList.forEach((u) => {
      if (u.role === 'SUPER_ADMIN') counts.SUPER_ADMIN++
      else if (u.role === 'ADMIN') counts.ADMIN++
      else counts.USER++
    })
    return counts
  }, [usersList])

  // Filtered and searched users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchQuery =
        (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uid.toLowerCase().includes(searchQuery.toLowerCase())

      const userRole = u.role || 'USER'
      const matchRole = roleFilter === 'ALL' || userRole === roleFilter

      return matchQuery && matchRole
    })
  }, [usersList, searchQuery, roleFilter])

  const openRoleChangeConfirm = (targetUser: UserProfile, newRole: UserRole) => {
    if (!isSuperAdmin) {
      setActionMessage({
        text: 'Hanya Super Admin yang dapat mengubah hak akses role pengguna.',
        type: 'error',
      })
      return
    }

    setRoleChangeModal({
      isOpen: true,
      targetUid: targetUser.uid,
      targetName: targetUser.name || 'Pengguna',
      targetEmail: targetUser.email,
      currentRole: targetUser.role || 'USER',
      newRole,
      loading: false,
    })
  }

  const handleConfirmRoleChange = async () => {
    if (!user?.uid || !roleChangeModal.targetUid) return

    setRoleChangeModal((p) => ({ ...p, loading: true }))
    try {
      await adminService.updateUserRole(user.uid, roleChangeModal.targetUid, roleChangeModal.newRole)
      setActionMessage({
        text: `Role ${roleChangeModal.targetName} berhasil diubah ke ${roleChangeModal.newRole}`,
        type: 'success',
      })
      setRefreshTrigger((p) => p + 1)
      setRoleChangeModal((p) => ({ ...p, isOpen: false, loading: false }))
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setActionMessage({
        text: errorObj.message || 'Gagal mengubah role pengguna',
        type: 'error',
      })
      setRoleChangeModal((p) => ({ ...p, loading: false }))
    }
  }

  const handleConfirmSeedCategories = async () => {
    setIsSeeding(true)
    try {
      await categoryService.seedCategories()
      setActionMessage({
        text: '27 Kategori transaksi sistem berhasil disinkronkan ke Firestore!',
        type: 'success',
      })
      setIsSeedConfirmOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setActionMessage({
        text: errorObj.message || 'Gagal sinkronisasi kategori',
        type: 'error',
      })
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
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Memuat Admin Console...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Admin Console
              </h1>
              <Badge variant={isSuperAdmin ? 'brand' : 'warning'} size="sm">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pusat kendali hak akses pengguna dan metrik sistem SaveMe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* 2. Toast / Action Notification Message */}
      {actionMessage && (
        <div
          className={cn(
            'p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all animate-in fade-in',
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Executive KPI Metric Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pengguna</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {stats?.totalUsers || 0}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{roleCounts.USER} User</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{roleCounts.ADMIN + roleCounts.SUPER_ADMIN} Admin</span>
          </div>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
            <ReceiptText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
            {stats?.totalTransactions || 0}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 block">
            Catatan mutasi kas global
          </span>
        </div>

        {/* Card 3: Total Recorded Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Volume Mutasi</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {formatRupiah(stats?.totalVolume || 0)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 block">
            Akumulasi perputaran dana
          </span>
        </div>

        {/* Card 4: Database Health */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Status Database</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">100% Terisolasi</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 block">
            Cloud Firestore Multi-Tenant
          </span>
        </div>
      </div>

      {/* 4. User Management Hub (Search, Filter, Table) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 shadow-xs">
        {/* Hub Header & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Daftar Pengguna ({filteredUsers.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola dan perbarui hak akses pengguna sistem
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, atau UID..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-slate-100 dark:border-white/8 text-xs font-semibold">
          {[
            { key: 'ALL', label: 'Semua', count: roleCounts.ALL },
            { key: 'USER', label: 'User Biasa', count: roleCounts.USER },
            { key: 'ADMIN', label: 'Admin', count: roleCounts.ADMIN },
            { key: 'SUPER_ADMIN', label: 'Super Admin', count: roleCounts.SUPER_ADMIN },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleFilter(tab.key as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5',
                roleFilter === tab.key
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px]',
                  roleFilter === tab.key
                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8 text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                <th className="pb-3 px-3">Pengguna</th>
                <th className="pb-3 px-3">Email Akun</th>
                <th className="pb-3 px-3">Role Saat Ini</th>
                <th className="pb-3 px-3 text-right">Kelola Hak Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/6">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Tidak ada pengguna yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr) => {
                  const isSelf = usr.uid === user?.uid
                  const currentRole = usr.role || 'USER'

                  return (
                    <tr key={usr.uid} className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {usr.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-xs">
                              {usr.name || 'Pengguna'}
                              {isSelf && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                  Anda
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[140px]">
                              {usr.uid}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {usr.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3">
                        <Badge
                          variant={
                            currentRole === 'SUPER_ADMIN'
                              ? 'brand'
                              : currentRole === 'ADMIN'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {currentRole}
                        </Badge>
                      </td>

                      {/* Role Selector Actions */}
                      <td className="py-3.5 px-3 text-right">
                        {isSuperAdmin && !isSelf ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <select
                              value={currentRole}
                              onChange={(e) => openRoleChangeConfirm(usr, e.target.value as UserRole)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1a1e2a] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all"
                            >
                              <option value="USER">Ubah ke USER</option>
                              <option value="ADMIN">Ubah ke ADMIN</option>
                              <option value="SUPER_ADMIN">Ubah ke SUPER_ADMIN</option>
                            </select>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>{isSelf ? 'Akun Utama' : 'Akses Terkunci'}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. System Tools & Maintenance Section (Clean & Tucked In) */}
      <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-[#151822]/60 border border-slate-200 dark:border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-200/70 dark:bg-white/8 text-slate-700 dark:text-slate-300">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pemeliharaan Database Kategori
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sinkronisasi 27 kategori pengeluaran &amp; pemasukan standar ke Cloud Firestore
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSeedConfirmOpen(true)}
          leftIcon={<Database className="w-3.5 h-3.5" />}
        >
          Sinkronisasi 27 Kategori
        </Button>
      </div>

      {/* Role Change Confirmation Modal */}
      <ConfirmModal
        isOpen={roleChangeModal.isOpen}
        title="Konfirmasi Perubahan Hak Akses"
        description={`Apakah Anda yakin ingin mengubah hak akses ${roleChangeModal.targetName} (${roleChangeModal.targetEmail}) dari ${roleChangeModal.currentRole} menjadi ${roleChangeModal.newRole}?`}
        confirmText="Ya, Ubah Role"
        cancelText="Batal"
        variant="warning"
        loading={roleChangeModal.loading}
        onConfirm={handleConfirmRoleChange}
        onClose={() => setRoleChangeModal((p) => ({ ...p, isOpen: false }))}
      />

      {/* Category Seed Confirmation Modal */}
      <ConfirmModal
        isOpen={isSeedConfirmOpen}
        title="Sinkronisasi 27 Kategori Sistem?"
        description="Aksi ini akan mendaftarkan 27 kategori transaksi lengkap (groceries, cafe, cicilan, freelance, dsb.) ke dalam koleksi Firestore jika belum tersedia."
        confirmText="Sinkronkan Sekarang"
        cancelText="Batal"
        variant="warning"
        loading={isSeeding}
        onConfirm={handleConfirmSeedCategories}
        onClose={() => setIsSeedConfirmOpen(false)}
      />
    </div>
  )
}
