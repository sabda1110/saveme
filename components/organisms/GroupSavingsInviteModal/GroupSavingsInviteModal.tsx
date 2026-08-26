'use client'

import React, { useState, useEffect } from 'react'
import { groupSavingsService } from '@/lib/services/group-savings.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { calculateSavingsFeasibility, type FeasibilityResult } from '@/lib/utils/financial-feasibility'
import { Button } from '@/components/atoms/Button'
import type { GroupSavings, GroupSavingsMember, Wallet } from '@/types'
import { Users, Target, Clock, CheckCircle2, X, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface GroupSavingsInviteModalProps {
  invite: GroupSavingsMember
  group: GroupSavings
  userId: string
  onClose: () => void
  onResponded: () => void
}

export function GroupSavingsInviteModal({
  invite,
  group,
  userId,
  onClose,
  onResponded,
}: GroupSavingsInviteModalProps) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null)

  const daysRemaining = group.targetDate
    ? Math.max(1, Math.ceil((new Date(group.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30

  const formatRp = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

  useEffect(() => {
    async function loadUserCash() {
      if (!userId) return
      try {
        const userWallets = await walletService.getUserWallets(userId)
        setWallets(userWallets)

        const spendingCash = userWallets
          .filter((w) => !w.isLocked && !w.isEarmarked)
          .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)

        const now = new Date()
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const daysLeftInMonth = Math.max(1, lastDay - now.getDate() + 1)

        const res = calculateSavingsFeasibility(
          invite.myTarget,
          group.targetDate,
          spendingCash,
          daysLeftInMonth
        )
        setFeasibility(res)
      } catch (err) {
        console.error('Error checking user cash for invite:', err)
      }
    }

    loadUserCash()
  }, [userId, invite.myTarget, group.targetDate])

  async function respond(response: 'ACCEPTED' | 'REJECTED') {
    setLoading(response === 'ACCEPTED' ? 'accept' : 'reject')
    setError(null)
    try {
      await groupSavingsService.respondToInvite(invite.id, userId, response)
      onResponded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memproses undangan')
    } finally {
      setLoading(null)
    }
  }

  const isDeficit = feasibility && !feasibility.isFeasible && !feasibility.isTight
  const isTight = feasibility && feasibility.isTight

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1a1d27] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#2d3348] overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-[#2d3348]">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-xl shrink-0">
              {group.icon || '🎯'}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                🎉 Undangan Celengan Bersama
              </p>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {group.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mb-1">
                <Target className="w-3 h-3" />
                Target Total Grup
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatRp(group.targetAmount)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348]">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mb-1">
                <Clock className="w-3 h-3" />
                Deadline
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {group.targetDate
                  ? new Date(group.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Fleksibel'}
              </p>
              {group.targetDate && (
                <p className="text-[10px] text-slate-500">{daysRemaining} hari lagi</p>
              )}
            </div>
          </div>

          {/* My share */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Porsi Bagian Kamu
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                {formatRp(invite.myTarget)}
              </p>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                {invite.percentage}%
              </span>
            </div>
            {group.targetDate && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 font-medium">
                ≈ {formatRp(Math.round(invite.myTarget / daysRemaining))}/hari selama {daysRemaining} hari
              </p>
            )}
          </div>

          {/* 🚨 FINANCIAL FEASIBILITY & DEFICIT WARNING 🚨 */}
          {feasibility && isDeficit && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/50 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                Peringatan Kapasitas Kas Harian (Defisit)
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Porsimu di celengan ini membutuhkan <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatRp(feasibility.dailyRequired)}/hari</strong>, sedangkan kapasitas kas harianmu saat ini hanya <strong className="font-mono text-slate-900 dark:text-white">{formatRp(feasibility.dailyCapacity)}/hari</strong> (Defisit <strong className="text-rose-600 font-mono">{formatRp(feasibility.deficitPerDay)}/hari</strong>).
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-rose-200 dark:border-rose-900/40">
                💡 <em>Catatan: Menerima undangan ini berisiko membuat jatah belanja harianmu tekor/habis. Pastikan kamu memiliki sumber dana lain.</em>
              </div>
            </div>
          )}

          {feasibility && isTight && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                Target Relatif Ketat
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Porsimu ({formatRp(feasibility.dailyRequired)}/hari) akan memakan sebagian besar kapasitas kas harianmu ({formatRp(feasibility.dailyCapacity)}/hari). Sisa uang belanja harianmu akan sangat terbatas.
              </p>
            </div>
          )}

          {feasibility && feasibility.isFeasible && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131620] border border-slate-200 dark:border-[#2d3348] flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Target ini aman dan sesuai dengan kapasitas kas harianmu ({formatRp(feasibility.dailyCapacity)}/hari).</span>
            </div>
          )}

          {/* Members preview */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Users className="w-3.5 h-3.5" />
            <span>Kamu diundang bergabung bersama anggota lainnya</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-200 dark:border-rose-800/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 p-4 sm:p-5 pt-0">
          <Button
            variant="ghost"
            className="flex-1 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            disabled={loading !== null}
            onClick={() => respond('REJECTED')}
          >
            {loading === 'reject' ? 'Menolak...' : '❌ Tolak'}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={loading !== null}
            onClick={() => respond('ACCEPTED')}
          >
            {loading === 'accept' ? 'Menerima...' : '✅ Terima'}
          </Button>
        </div>
      </div>
    </div>
  )
}
