'use client'

import React, { useState, useEffect } from 'react'
import { groupSavingsService } from '@/lib/services/group-savings.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import type {
  GroupSavings,
  GroupSavingsMember,
  GroupSavingsContribution,
  Wallet,
} from '@/types'
import {
  Users,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Clock,
  CheckCircle2,
  Trash2,
  LogOut,
  ArrowUpRight,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface GroupSavingsCardProps {
  group: GroupSavings
  myMember: GroupSavingsMember
  allMembers: GroupSavingsMember[]
  onRefresh: () => void
}

export function GroupSavingsCard({
  group,
  myMember,
  allMembers,
  onRefresh,
}: GroupSavingsCardProps) {
  const { user, userProfile } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [contributions, setContributions] = useState<GroupSavingsContribution[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loadingContribs, setLoadingContribs] = useState(false)

  // Deposit modal state
  const [depositOpen, setDepositOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositNotes, setDepositNotes] = useState('')
  const [depositWalletId, setDepositWalletId] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)

  // Leave/delete confirm
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  const isCreator = group.createdBy === user?.uid
  const acceptedMembers = allMembers.filter((m) => m.status === 'ACCEPTED')
  const totalContributed = acceptedMembers.reduce((s, m) => s + m.myContributed, 0)
  const progressPercent = Math.min(100, Math.round((totalContributed / group.targetAmount) * 100))

  const daysRemaining = group.targetDate
    ? Math.max(0, Math.ceil((new Date(group.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const formatRp = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

  const formatDate = (iso: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  async function loadContribs() {
    setLoadingContribs(true)
    try {
      const [contribs, userWallets] = await Promise.all([
        groupSavingsService.getContributions(group.id),
        walletService.getUserWallets(user!.uid),
      ])
      setContributions(contribs)
      setWallets(userWallets)
      if (userWallets.length > 0) setDepositWalletId(userWallets[0].id)
    } finally {
      setLoadingContribs(false)
    }
  }

  useEffect(() => {
    if (expanded) loadContribs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  async function handleDeposit() {
    if (!user?.uid) return
    const amt = Number(depositAmount.replace(/\D/g, ''))
    if (!amt || amt <= 0) {
      setDepositError('Masukkan nominal yang valid')
      return
    }
    setDepositLoading(true)
    setDepositError(null)
    try {
      await groupSavingsService.addContribution(
        group.id,
        user.uid,
        userProfile?.name || user.email || 'Kamu',
        amt,
        depositNotes
      )
      setDepositOpen(false)
      setDepositAmount('')
      setDepositNotes('')
      await loadContribs()
      onRefresh()
    } catch (err: unknown) {
      setDepositError(err instanceof Error ? err.message : 'Gagal menyetor')
    } finally {
      setDepositLoading(false)
    }
  }

  async function handleLeave() {
    if (!user?.uid) return
    try {
      await groupSavingsService.leaveOrDeleteGroup(group.id, user.uid)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const [resolutionLoading, setResolutionLoading] = useState<string | null>(null)

  async function handleResolveDeadline(memberId: string, requestedDate?: string) {
    setResolutionLoading(memberId)
    try {
      const currentD = group.targetDate ? new Date(group.targetDate) : new Date()
      const newD = requestedDate || new Date(currentD.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await groupSavingsService.resolveChangeWithDeadline(group.id, memberId, newD)
      onRefresh()
    } catch (err) {
      console.error('Error resolving deadline:', err)
    } finally {
      setResolutionLoading(null)
    }
  }

  async function handleResolveHostSubsidy(memberId: string, hostMemberId: string, newPercentage: number) {
    setResolutionLoading(memberId)
    try {
      await groupSavingsService.resolveChangeWithHostSubsidy(group.id, memberId, hostMemberId, newPercentage, group.targetAmount)
      onRefresh()
    } catch (err) {
      console.error('Error resolving host subsidy:', err)
    } finally {
      setResolutionLoading(null)
    }
  }

  async function handleResolveSplitRemaining(memberId: string, newPercentage: number) {
    setResolutionLoading(memberId)
    try {
      await groupSavingsService.resolveChangeWithSplitRemaining(group.id, memberId, newPercentage, group.targetAmount)
      onRefresh()
    } catch (err) {
      console.error('Error resolving split remaining:', err)
    } finally {
      setResolutionLoading(null)
    }
  }

  const membersWithRequests = allMembers.filter((m) => Boolean(m.changeRequest))
  const hostMember = allMembers.find((m) => m.userId === group.createdBy)

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#2d3348] bg-white dark:bg-[#1a1d27] overflow-hidden shadow-sm">
      {/* 💬 HOST RESOLUTION BANNER FOR MEMBER CHANGE REQUESTS */}
      {isCreator && membersWithRequests.length > 0 && (
        <div className="p-4 bg-purple-50/80 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800/60 space-y-3">
          {membersWithRequests.map((reqMember) => {
            const req = reqMember.changeRequest!
            const reqPct = req.requestedPercentage !== undefined ? req.requestedPercentage : reqMember.percentage
            const oldPct = reqMember.percentage
            const diffPct = Math.max(0, oldPct - reqPct)

            return (
              <div key={reqMember.id} className="space-y-2.5">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                        💬 Permintaan Penyesuaian
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {reqMember.displayName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Mengajukan porsi <strong className="text-purple-700 dark:text-purple-300 font-mono">{reqPct}% ({formatRp(Math.round((group.targetAmount * reqPct) / 100))})</strong> (sebelumnya {oldPct}%).
                      {req.requestedDate && (
                        <span> Minta deadline diundur ke <strong>{new Date(req.requestedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.</span>
                      )}
                    </p>
                    {req.note && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white/70 dark:bg-[#131620]/70 p-2 rounded-lg border border-purple-200 dark:border-purple-900/40">
                        &ldquo;{req.note}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-200 dark:border-purple-900/40 space-y-1.5">
                  <p className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                    🛠️ Pilih Solusi Resolusi untuk Grup Ini:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Option 1: Extend Deadline (Safe for Everyone) */}
                    <button
                      type="button"
                      disabled={resolutionLoading === reqMember.id}
                      onClick={() => handleResolveDeadline(reqMember.id, req.requestedDate)}
                      className="p-2.5 rounded-xl bg-white dark:bg-[#1a1d27] border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>1. Perpanjang Jadwal ⭐</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Cicilan semua orang makin enteng. Tidak ada yang nambah uang!
                      </p>
                    </button>

                    {/* Option 2: Host Subsidy */}
                    <button
                      type="button"
                      disabled={resolutionLoading === reqMember.id || !hostMember}
                      onClick={() => handleResolveHostSubsidy(reqMember.id, hostMember?.id || '', reqPct)}
                      className="p-2.5 rounded-xl bg-white dark:bg-[#1a1d27] border border-purple-300 dark:border-purple-700/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-left transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-bold text-xs">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>2. Subsidi oleh Host</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Host tanggung selisih {diffPct}%. Porsi anggota lain tetap sama.
                      </p>
                    </button>

                    {/* Option 3: Split remaining across others */}
                    <button
                      type="button"
                      disabled={resolutionLoading === reqMember.id}
                      onClick={() => handleResolveSplitRemaining(reqMember.id, reqPct)}
                      className="p-2.5 rounded-xl bg-white dark:bg-[#1a1d27] border border-blue-300 dark:border-blue-700/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-left transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-xs">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>3. Bagi Rata ke Lainnya</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Selisih {diffPct}% dibagi rata ke sisa anggota yang ada.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{group.icon}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                {group.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {acceptedMembers.length} anggota
                </span>
                {daysRemaining !== null && (
                  <span className={cn(
                    'text-xs flex items-center gap-1',
                    daysRemaining <= 7 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'
                  )}>
                    <Clock className="w-3 h-3" />
                    {daysRemaining > 0 ? `${daysRemaining} hari lagi` : 'Jatuh tempo!'}
                  </span>
                )}
                {group.status === 'COMPLETED' && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Selesai!
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {progressPercent}%
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar total */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{formatRp(totalContributed)}</span>
            <span>{formatRp(group.targetAmount)}</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-[#21263a] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick stats: My contribution */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Bagianku ({myMember.percentage}%): {' '}
            <span className="text-slate-700 dark:text-slate-200 font-semibold">
              {formatRp(myMember.myContributed)} / {formatRp(myMember.myTarget)}
            </span>
          </span>
          {group.status === 'ACTIVE' && (
            <Button size="sm" variant="primary" onClick={() => { setDepositOpen(true); setExpanded(true) }}>
              <ArrowUpRight className="w-3.5 h-3.5" />
              Setor
            </Button>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-[#2d3348] divide-y divide-slate-100 dark:divide-[#2d3348]">
          {/* Anggota */}
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Rekap Per Anggota
            </p>
            <div className="space-y-2">
              {acceptedMembers.map((m) => {
                const pct = Math.min(100, Math.round((m.myContributed / Math.max(1, m.myTarget)) * 100))
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        {m.userId === user?.uid ? '👤 Kamu' : m.displayName}
                        {m.userId === group.createdBy && (
                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1 rounded">Host</span>
                        )}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {m.percentage}% • {formatRp(m.myContributed)} / {formatRp(m.myTarget)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-[#21263a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 dark:bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {allMembers.filter((m) => m.status === 'PENDING').map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs text-slate-400">
                  <span>⏳ {m.displayName}</span>
                  <span className="text-amber-500">Menunggu konfirmasi...</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deposit form */}
          {depositOpen && group.status === 'ACTIVE' && (
            <div className="p-4 bg-slate-50 dark:bg-[#131620]">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                Catat Setoran Kamu
              </p>
              <div className="space-y-3">
                <FormField label="Nominal Setoran">
                  <Input
                    type="number"
                    placeholder="Rp 0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </FormField>
                {wallets.length > 0 && (
                  <FormField label="Dari Kantong">
                    <select
                      value={depositWalletId}
                      onChange={(e) => setDepositWalletId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-[#2d3348] bg-white dark:bg-[#1a1d27] text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon} {w.name} — {formatRp(w.balance)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}
                <FormField label="Catatan (opsional)">
                  <Input
                    placeholder="Gajian bulan ini 🎉"
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                  />
                </FormField>
                {depositError && (
                  <p className="text-xs text-rose-500">{depositError}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDepositOpen(false)}>
                    Batal
                  </Button>
                  <Button variant="primary" size="sm" disabled={depositLoading} onClick={handleDeposit}>
                    {depositLoading ? 'Menyimpan...' : 'Simpan Setoran'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* History setoran */}
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              History Setoran
            </p>
            {loadingContribs ? (
              <p className="text-xs text-slate-400 text-center py-3">Memuat...</p>
            ) : contributions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Belum ada setoran</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {contributions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                        {(c.displayName || '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {c.userId === user?.uid ? 'Kamu' : c.displayName}
                        </p>
                        {c.notes && (
                          <p className="text-slate-400 truncate text-[10px]">{c.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        +{formatRp(c.amount)}
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        {formatDate(c.contributedAt as string)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 flex justify-end">
            <button
              onClick={() => setLeaveConfirmOpen(true)}
              className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 transition-colors"
            >
              {isCreator ? (
                <><Trash2 className="w-3.5 h-3.5" /> Bubarkan Grup</>
              ) : (
                <><LogOut className="w-3.5 h-3.5" /> Keluar dari Grup</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirm leave/delete */}
      <ConfirmModal
        isOpen={leaveConfirmOpen}
        title={isCreator ? 'Bubarkan Grup?' : 'Keluar dari Grup?'}
        description={
          isCreator
            ? `Grup "${group.name}" akan dibubarkan dan tidak bisa diaktifkan lagi.`
            : `Kamu akan keluar dari grup "${group.name}".`
        }
        confirmText={isCreator ? 'Bubarkan' : 'Keluar'}
        variant="danger"
        onConfirm={handleLeave}
        onClose={() => setLeaveConfirmOpen(false)}
      />
    </div>
  )
}
