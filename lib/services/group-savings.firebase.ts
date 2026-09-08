import { db } from '@/lib/firebase/config'
import {
  collection,
  addDoc,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteField,
  Timestamp,
} from 'firebase/firestore'
import type {
  GroupSavings,
  GroupSavingsMember,
  GroupSavingsContribution,
} from '@/types'

// ─── Helper ──────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date(val as string)
}

/**
 * Trigger background and FCM push notification for newly invited member
 */
async function notifyGroupInvite({
  recipientUserId,
  inviterName,
  groupName,
  targetAmount,
  groupId,
}: {
  recipientUserId: string
  inviterName: string
  groupName: string
  targetAmount: number
  groupId: string
}) {
  try {
    if (typeof window !== 'undefined') {
      fetch('/api/notifications/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId,
          inviterName,
          groupName,
          targetAmount,
          groupId,
        }),
      }).catch((err) => {
        console.warn('[groupSavingsService] Failed to call send-invite API:', err)
      })
    }
  } catch (err) {
    console.warn('[groupSavingsService] notifyGroupInvite error:', err)
  }
}

export interface VerifiedUserProfile {
  uid: string
  name: string
  email: string
  role?: string
  incomeType?: string
  photoURL?: string
  joinedYear?: number
}

// ─── Group Savings Service ────────────────────────────────────────────────────

export const groupSavingsService = {
  // ── Verify and lookup user by email in real-time ──────────────────────────
  async verifyUserByEmail(email: string): Promise<VerifiedUserProfile | null> {
    if (!email || !email.includes('@')) return null
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', email.trim().toLowerCase())
      )
      const snap = await getDocs(q)
      if (snap.empty) return null
      const docData = snap.docs[0].data()
      const createdAtDate = docData.createdAt ? toDate(docData.createdAt) : new Date()
      return {
        uid: snap.docs[0].id,
        name: docData.name || docData.email?.split('@')[0] || 'User',
        email: docData.email || email,
        role: docData.role || 'USER',
        incomeType: docData.incomeType || 'SALARIED',
        photoURL: docData.photoURL || '',
        joinedYear: createdAtDate.getFullYear(),
      }
    } catch {
      return null
    }
  },

  // ── Find user by email (backward compatibility) ───────────────────────────
  async findUserByEmail(email: string): Promise<{ uid: string; name: string; email: string } | null> {
    const user = await this.verifyUserByEmail(email)
    if (!user) return null
    return { uid: user.uid, name: user.name, email: user.email }
  },

  // ── Create group with multiple members in a single step ───────────────────
  async createGroupWithMultiMembers(
    hostUserId: string,
    hostDisplayName: string,
    hostEmail: string,
    groupData: {
      name: string
      icon: string
      targetAmount: number
      targetDate?: string
    },
    hostPercentage: number,
    invitees: {
      userId: string
      displayName: string
      email: string
      percentage: number
    }[]
  ): Promise<GroupSavings> {
    if (!hostUserId) throw new Error('Unauthorized')

    const totalTarget = Number(groupData.targetAmount)
    const hostTarget = Math.round((totalTarget * hostPercentage) / 100)

    const payload = {
      createdBy: hostUserId,
      name: groupData.name.trim(),
      icon: groupData.icon || '🎯',
      targetAmount: totalTarget,
      targetDate: groupData.targetDate || '',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'group_savings'), payload)
    const groupId = docRef.id

    // 1. Add Host Member (ACCEPTED)
    await addDoc(collection(db, 'group_savings_members'), {
      groupId,
      userId: hostUserId,
      displayName: hostDisplayName.trim(),
      email: hostEmail.trim().toLowerCase(),
      percentage: hostPercentage,
      myTarget: hostTarget,
      myContributed: 0,
      status: 'ACCEPTED',
      invitedAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
    })

    // 2. Add All Invitees (PENDING) & Trigger Push Notifications
    await Promise.all(
      invitees.map(async (inv) => {
        const myTarget = Math.round((totalTarget * inv.percentage) / 100)
        const docRef = await addDoc(collection(db, 'group_savings_members'), {
          groupId,
          userId: inv.userId,
          displayName: inv.displayName.trim(),
          email: inv.email.trim().toLowerCase(),
          percentage: inv.percentage,
          myTarget,
          myContributed: 0,
          status: 'PENDING',
          invitedAt: serverTimestamp(),
        })

        // Notify recipient in background / FCM
        notifyGroupInvite({
          recipientUserId: inv.userId,
          inviterName: hostDisplayName,
          groupName: groupData.name,
          targetAmount: myTarget,
          groupId,
        })

        return docRef
      })
    )

    return { id: groupId, ...payload } as unknown as GroupSavings
  },

  // ── Create a new group savings ───────────────────────────────────────────

  async createGroup(
    userId: string,
    displayName: string,
    data: {
      name: string
      icon: string
      targetAmount: number
      targetDate?: string
    }
  ): Promise<GroupSavings> {
    if (!userId) throw new Error('Unauthorized')

    const payload = {
      createdBy: userId,
      name: data.name.trim(),
      icon: data.icon || '🎯',
      targetAmount: Number(data.targetAmount),
      targetDate: data.targetDate || '',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'group_savings'), payload)
    const groupId = docRef.id

    // Auto-add creator as first member (100% default, adjusted later)
    await addDoc(collection(db, 'group_savings_members'), {
      groupId,
      userId,
      displayName: displayName.trim(),
      email: '',
      percentage: 100,
      myTarget: Number(data.targetAmount),
      myContributed: 0,
      status: 'ACCEPTED',
      invitedAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
    })

    return { id: groupId, ...payload } as unknown as GroupSavings
  },

  // ── Invite a member to a group ────────────────────────────────────────────

  async inviteMember(
    groupId: string,
    invitedByUserId: string,
    invitee: { userId: string; displayName: string; email: string; percentage: number },
    groupTargetAmount: number
  ): Promise<GroupSavingsMember> {
    if (!invitedByUserId) throw new Error('Unauthorized')

    const myTarget = Math.round((groupTargetAmount * invitee.percentage) / 100)

    const payload = {
      groupId,
      userId: invitee.userId,
      displayName: invitee.displayName.trim(),
      email: invitee.email.trim().toLowerCase(),
      percentage: invitee.percentage,
      myTarget,
      myContributed: 0,
      status: 'PENDING',
      invitedAt: serverTimestamp(),
    }
    const docRef = await addDoc(collection(db, 'group_savings_members'), payload)

    // Notify recipient in background / FCM
    try {
      getDoc(doc(db, 'group_savings', groupId)).then(async (groupSnap) => {
        const groupName = groupSnap.exists() ? groupSnap.data().name : 'Celengan Bersama'
        const inviterSnap = await getDoc(doc(db, 'users', invitedByUserId))
        const inviterName = inviterSnap.exists() ? inviterSnap.data().name : 'Teman'

        notifyGroupInvite({
          recipientUserId: invitee.userId,
          inviterName,
          groupName,
          targetAmount: myTarget,
          groupId,
        })
      })
    } catch {
      // ignore
    }

    return { id: docRef.id, ...payload } as unknown as GroupSavingsMember
  },

  // ── Respond to an invite (ACCEPTED / REJECTED) ────────────────────────────

  async respondToInvite(
    memberId: string,
    userId: string,
    response: 'ACCEPTED' | 'REJECTED'
  ): Promise<void> {
    const docRef = doc(db, 'group_savings_members', memberId)
    const snap = await getDoc(docRef)

    if (!snap.exists()) throw new Error('Undangan tidak ditemukan')
    const data = snap.data()
    if (data.userId !== userId) throw new Error('Akses ditolak')
    if (data.status !== 'PENDING') throw new Error('Undangan sudah diproses')

    await updateDoc(docRef, {
      status: response,
      respondedAt: serverTimestamp(),
    })
  },

  // ── Get all groups where user is a member (ACCEPTED) ─────────────────────

  async getUserGroups(userId: string): Promise<{
    group: GroupSavings
    member: GroupSavingsMember
    allMembers: GroupSavingsMember[]
  }[]> {
    if (!userId) return []

    try {
      const memberQ = query(
        collection(db, 'group_savings_members'),
        where('userId', '==', userId),
        where('status', '==', 'ACCEPTED')
      )
      const memberSnap = await getDocs(memberQ)
      const members = memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupSavingsMember[]

      if (members.length === 0) return []

      const results = await Promise.all(
        members.map(async (member) => {
          const groupSnap = await getDoc(doc(db, 'group_savings', member.groupId))
          if (!groupSnap.exists()) return null

          const group = { id: groupSnap.id, ...groupSnap.data() } as GroupSavings
          if (group.status !== 'ACTIVE' && group.status !== 'DISSOLUTION_PENDING') return null

          // Fetch all members of this group
          const allMembersQ = query(
            collection(db, 'group_savings_members'),
            where('groupId', '==', member.groupId)
          )
          const allMembersSnap = await getDocs(allMembersQ)
          const allMembers = allMembersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupSavingsMember[]

          return { group, member, allMembers }
        })
      )

      return results.filter((r): r is NonNullable<typeof r> => r !== null)
    } catch (err) {
      console.error('[groupSavingsService] getUserGroups error:', err)
      return []
    }
  },

  // ── Get pending invites for a user ────────────────────────────────────────

  async getPendingInvites(userId: string): Promise<{
    invite: GroupSavingsMember
    group: GroupSavings
  }[]> {
    if (!userId) return []

    try {
      const q = query(
        collection(db, 'group_savings_members'),
        where('userId', '==', userId),
        where('status', '==', 'PENDING')
      )
      const snap = await getDocs(q)
      const invites = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupSavingsMember[]

      const results = await Promise.all(
        invites.map(async (invite) => {
          const groupSnap = await getDoc(doc(db, 'group_savings', invite.groupId))
          if (!groupSnap.exists()) return null
          const group = { id: groupSnap.id, ...groupSnap.data() } as GroupSavings
          return { invite, group }
        })
      )

      return results.filter((r): r is NonNullable<typeof r> => r !== null)
    } catch (err) {
      console.error('[groupSavingsService] getPendingInvites error:', err)
      return []
    }
  },

  // ── Add a contribution ────────────────────────────────────────────────────

  async addContribution(
    groupId: string,
    userId: string,
    displayName: string,
    amount: number,
    notes?: string
  ): Promise<void> {
    if (!userId) throw new Error('Unauthorized')
    if (amount <= 0) throw new Error('Nominal harus lebih dari 0')

    // 1. Add contribution record
    await addDoc(collection(db, 'group_savings_contributions'), {
      groupId,
      userId,
      displayName: displayName.trim(),
      amount: Number(amount),
      notes: notes?.trim() || '',
      contributedAt: serverTimestamp(),
    })

    // 2. Update member's myContributed
    const memberQ = query(
      collection(db, 'group_savings_members'),
      where('groupId', '==', groupId),
      where('userId', '==', userId)
    )
    const memberSnap = await getDocs(memberQ)
    if (!memberSnap.empty) {
      const memberDoc = memberSnap.docs[0]
      const currentContributed = Number(memberDoc.data().myContributed || 0)
      await updateDoc(memberDoc.ref, {
        myContributed: currentContributed + Number(amount),
      })
    }

    // 3. Check if group is fully completed
    const allMembersQ = query(
      collection(db, 'group_savings_members'),
      where('groupId', '==', groupId),
      where('status', '==', 'ACCEPTED')
    )
    const allMembersSnap = await getDocs(allMembersQ)
    const allMembers = allMembersSnap.docs.map((d) => ({ ...d.data() }))
    const groupDoc = await getDoc(doc(db, 'group_savings', groupId))
    if (groupDoc.exists()) {
      const targetAmount = Number(groupDoc.data().targetAmount)
      const totalContributed = allMembers.reduce((s, m) => s + Number(m.myContributed || 0), 0)
      if (totalContributed >= targetAmount) {
        await updateDoc(doc(db, 'group_savings', groupId), { status: 'COMPLETED', updatedAt: serverTimestamp() })
      }
    }
  },

  // ── Get contributions for a group ─────────────────────────────────────────

  async getContributions(groupId: string): Promise<GroupSavingsContribution[]> {
    try {
      const q = query(
        collection(db, 'group_savings_contributions'),
        where('groupId', '==', groupId),
        orderBy('contributedAt', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          contributedAt: data.contributedAt ? toDate(data.contributedAt).toISOString() : new Date().toISOString(),
        }
      }) as GroupSavingsContribution[]
    } catch (err) {
      console.error('[groupSavingsService] getContributions error:', err)
      return []
    }
  },

  // ── Update member percentages after all have joined ───────────────────────

  async updateMemberPercentage(
    memberId: string,
    userId: string,
    percentage: number,
    myTarget: number
  ): Promise<void> {
    const docRef = doc(db, 'group_savings_members', memberId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) throw new Error('Member tidak ditemukan')
    if (snap.data().userId !== userId) throw new Error('Akses ditolak')
    await updateDoc(docRef, { percentage, myTarget })
  },

  // ── Delete / Leave a group ────────────────────────────────────────────────

  async leaveOrDeleteGroup(groupId: string, userId: string): Promise<void> {
    // Check if user is creator
    const groupSnap = await getDoc(doc(db, 'group_savings', groupId))
    if (!groupSnap.exists()) throw new Error('Grup tidak ditemukan')

    if (groupSnap.data().createdBy === userId) {
      // Creator deletes entire group
      await updateDoc(doc(db, 'group_savings', groupId), {
        status: 'CANCELLED',
        dissolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      // Non-creator leaves: mark their member record as REJECTED
      const memberQ = query(
        collection(db, 'group_savings_members'),
        where('groupId', '==', groupId),
        where('userId', '==', userId)
      )
      const memberSnap = await getDocs(memberQ)
      if (!memberSnap.empty) {
        await deleteDoc(memberSnap.docs[0].ref)
      }
    }
  },

  // ── Request Group Dissolution (Requires Consensus if >= 2 Members) ────────
  async requestGroupDissolution(
    groupId: string,
    userId: string,
    userDisplayName: string,
    reason?: string
  ): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')

    const groupRef = doc(db, 'group_savings', groupId)
    const groupSnap = await getDoc(groupRef)
    if (!groupSnap.exists()) throw new Error('Grup tidak ditemukan')

    // Fetch all active accepted members of this group
    const membersQ = query(
      collection(db, 'group_savings_members'),
      where('groupId', '==', groupId),
      where('status', '==', 'ACCEPTED')
    )
    const membersSnap = await getDocs(membersQ)
    const acceptedMembers = membersSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as GroupSavingsMember[]

    // Verify user is among the accepted members
    const isMember = acceptedMembers.some((m) => m.userId === userId)
    if (!isMember && groupSnap.data().createdBy !== userId) {
      throw new Error('Hanya anggota aktif yang dapat mengajukan pembubaran grup')
    }

    // If only 1 accepted member or none, disband immediately
    if (acceptedMembers.length <= 1) {
      await updateDoc(groupRef, {
        status: 'CANCELLED',
        dissolvedAt: serverTimestamp(),
        dissolutionRequest: {
          requestedBy: userId,
          requestedByName: userDisplayName || 'Anggota',
          reason: reason?.trim() || 'Dibubarkan oleh anggota tunggal',
          requestedAt: serverTimestamp(),
          status: 'APPROVED',
          votes: { [userId]: 'APPROVED' },
        },
        dissolutionDismissedBy: [userId],
        updatedAt: serverTimestamp(),
      })
      return true
    }

    // 2 or more members: Initiate dissolution consensus
    await updateDoc(groupRef, {
      status: 'DISSOLUTION_PENDING',
      dissolutionRequest: {
        requestedBy: userId,
        requestedByName: userDisplayName || 'Anggota',
        reason: reason?.trim() || 'Pengajuan pembubaran grup',
        requestedAt: serverTimestamp(),
        status: 'PENDING',
        votes: {
          [userId]: 'APPROVED', // initiator votes approved by default
        },
      },
      updatedAt: serverTimestamp(),
    })
    return false
  },

  // ── Vote on Group Dissolution (Approve or Reject) ──────────────────────────
  async voteGroupDissolution(
    groupId: string,
    userId: string,
    decision: 'APPROVED' | 'REJECTED'
  ): Promise<{ allApproved: boolean; rejected: boolean }> {
    if (!userId) throw new Error('Unauthorized')

    const groupRef = doc(db, 'group_savings', groupId)
    const groupSnap = await getDoc(groupRef)
    if (!groupSnap.exists()) throw new Error('Grup tidak ditemukan')

    const groupData = groupSnap.data()
    const req = groupData.dissolutionRequest
    if (!req || req.status !== 'PENDING') {
      throw new Error('Tidak ada pengajuan pembubaran yang sedang aktif')
    }

    // If user rejects, cancel the dissolution immediately
    if (decision === 'REJECTED') {
      await updateDoc(groupRef, {
        status: 'ACTIVE',
        'dissolutionRequest.status': 'REJECTED',
        [`dissolutionRequest.votes.${userId}`]: 'REJECTED',
        updatedAt: serverTimestamp(),
      })
      return { allApproved: false, rejected: true }
    }

    // User approves: record vote and check if all members agreed
    const currentVotes = (req.votes || {}) as Record<string, 'APPROVED' | 'REJECTED'>
    const updatedVotes = {
      ...currentVotes,
      [userId]: 'APPROVED' as const,
    }

    // Get all accepted members
    const membersQ = query(
      collection(db, 'group_savings_members'),
      where('groupId', '==', groupId),
      where('status', '==', 'ACCEPTED')
    )
    const membersSnap = await getDocs(membersQ)
    const acceptedMemberIds = membersSnap.docs.map((d) => d.data().userId)

    const allApproved = acceptedMemberIds.every((mId) => updatedVotes[mId] === 'APPROVED')

    if (allApproved) {
      // Group is officially dissolved upon full consensus
      await updateDoc(groupRef, {
        status: 'CANCELLED',
        dissolvedAt: serverTimestamp(),
        'dissolutionRequest.status': 'APPROVED',
        'dissolutionRequest.votes': updatedVotes,
        dissolutionDismissedBy: [], // reset so all members see the notice
        updatedAt: serverTimestamp(),
      })
      return { allApproved: true, rejected: false }
    } else {
      // Vote recorded, still waiting for other members
      await updateDoc(groupRef, {
        'dissolutionRequest.votes': updatedVotes,
        updatedAt: serverTimestamp(),
      })
      return { allApproved: false, rejected: false }
    }
  },

  // ── Cancel Group Dissolution (Only Initiator) ─────────────────────────────
  async cancelGroupDissolution(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(db, 'group_savings', groupId)
    const groupSnap = await getDoc(groupRef)
    if (!groupSnap.exists()) throw new Error('Grup tidak ditemukan')

    const req = groupSnap.data().dissolutionRequest
    if (!req || req.requestedBy !== userId) {
      throw new Error('Hanya pengaju pembubaran yang dapat membatalkan pengajuan')
    }

    await updateDoc(groupRef, {
      status: 'ACTIVE',
      dissolutionRequest: deleteField(),
      updatedAt: serverTimestamp(),
    })
  },

  // ── Get Dissolved Group Notices for a User ────────────────────────────────
  async getDissolvedGroupNotices(userId: string): Promise<{
    group: GroupSavings
    member: GroupSavingsMember
  }[]> {
    if (!userId) return []

    try {
      const memberQ = query(
        collection(db, 'group_savings_members'),
        where('userId', '==', userId),
        where('status', '==', 'ACCEPTED')
      )
      const memberSnap = await getDocs(memberQ)
      if (memberSnap.empty) return []

      const results = await Promise.all(
        memberSnap.docs.map(async (mDoc) => {
          const mData = { id: mDoc.id, ...mDoc.data() } as GroupSavingsMember
          const gSnap = await getDoc(doc(db, 'group_savings', mData.groupId))
          if (!gSnap.exists()) return null
          const gData = { id: gSnap.id, ...gSnap.data() } as GroupSavings

          // Group was cancelled/dissolved, has dissolvedAt, and not yet dismissed by this user
          if (gData.status === 'CANCELLED' && gData.dissolvedAt) {
            const dismissed = gData.dissolutionDismissedBy || []
            if (!dismissed.includes(userId)) {
              return { group: gData, member: mData }
            }
          }
          return null
        })
      )

      return results.filter((r): r is NonNullable<typeof r> => r !== null)
    } catch (err) {
      console.error('[groupSavingsService] getDissolvedGroupNotices error:', err)
      return []
    }
  },

  // ── Dismiss Dissolution Notice ────────────────────────────────────────────
  async dismissDissolutionNotice(groupId: string, userId: string): Promise<void> {
    if (!groupId || !userId) return
    try {
      const gRef = doc(db, 'group_savings', groupId)
      const gSnap = await getDoc(gRef)
      if (!gSnap.exists()) return
      const dismissed = (gSnap.data().dissolutionDismissedBy || []) as string[]
      if (!dismissed.includes(userId)) {
        await updateDoc(gRef, {
          dissolutionDismissedBy: [...dismissed, userId],
          updatedAt: serverTimestamp(),
        })
      }
    } catch (err) {
      console.error('[groupSavingsService] dismissDissolutionNotice error:', err)
    }
  },

  // ── Request Member Change (Negotiate Percentage / Deadline) ───────────────
  async requestMemberChange(
    memberId: string,
    userId: string,
    change: {
      requestedPercentage?: number
      requestedDate?: string
      note?: string
    }
  ): Promise<void> {
    const docRef = doc(db, 'group_savings_members', memberId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) throw new Error('Undangan tidak ditemukan')
    const data = snap.data()
    if (data.userId !== userId) throw new Error('Akses ditolak')

    await updateDoc(docRef, {
      changeRequest: {
        requestedPercentage: change.requestedPercentage !== undefined ? Number(change.requestedPercentage) : undefined,
        requestedDate: change.requestedDate || undefined,
        note: change.note?.trim() || '',
        requestedAt: serverTimestamp(),
      },
    })
  },

  // ── Resolution Option 1: Extend Group Deadline ────────────────────────────
  async resolveChangeWithDeadline(
    groupId: string,
    memberId: string,
    newTargetDate: string
  ): Promise<void> {
    // 1. Update group targetDate
    await updateDoc(doc(db, 'group_savings', groupId), {
      targetDate: newTargetDate,
      updatedAt: serverTimestamp(),
    })

    // 2. Accept member and clear change request
    const memberRef = doc(db, 'group_savings_members', memberId)
    await updateDoc(memberRef, {
      status: 'ACCEPTED',
      changeRequest: deleteField(),
      respondedAt: serverTimestamp(),
    })
  },

  // ── Resolution Option 2: Host Subsidy (Host takes over remaining %) ───────
  async resolveChangeWithHostSubsidy(
    groupId: string,
    memberId: string,
    hostMemberId: string,
    newPercentage: number,
    groupTargetAmount: number
  ): Promise<void> {
    const memberRef = doc(db, 'group_savings_members', memberId)
    const hostRef = doc(db, 'group_savings_members', hostMemberId)

    const [memberSnap, hostSnap] = await Promise.all([getDoc(memberRef), getDoc(hostRef)])
    if (!memberSnap.exists() || !hostSnap.exists()) throw new Error('Data anggota tidak ditemukan')

    const oldMemberPct = Number(memberSnap.data().percentage || 0)
    const diffPct = Math.max(0, oldMemberPct - newPercentage)

    const oldHostPct = Number(hostSnap.data().percentage || 0)
    const newHostPct = oldHostPct + diffPct

    // Update requesting member
    await updateDoc(memberRef, {
      percentage: newPercentage,
      myTarget: Math.round((groupTargetAmount * newPercentage) / 100),
      status: 'ACCEPTED',
      changeRequest: deleteField(),
      respondedAt: serverTimestamp(),
    })

    // Update host
    await updateDoc(hostRef, {
      percentage: newHostPct,
      myTarget: Math.round((groupTargetAmount * newHostPct) / 100),
    })
  },

  // ── Resolution Option 3: Split remaining % across other members ───────────
  async resolveChangeWithSplitRemaining(
    groupId: string,
    memberId: string,
    newPercentage: number,
    groupTargetAmount: number
  ): Promise<void> {
    const memberRef = doc(db, 'group_savings_members', memberId)
    const memberSnap = await getDoc(memberRef)
    if (!memberSnap.exists()) throw new Error('Data anggota tidak ditemukan')

    const oldMemberPct = Number(memberSnap.data().percentage || 0)
    const diffPct = Math.max(0, oldMemberPct - newPercentage)

    // Get all other members (ACCEPTED or PENDING)
    const q = query(
      collection(db, 'group_savings_members'),
      where('groupId', '==', groupId)
    )
    const allMembersSnap = await getDocs(q)
    const otherMembers = allMembersSnap.docs.filter((d) => d.id !== memberId)

    if (otherMembers.length > 0 && diffPct > 0) {
      const sharePerPerson = Math.floor(diffPct / otherMembers.length)
      const remainder = diffPct - (sharePerPerson * otherMembers.length)

      await Promise.all(
        otherMembers.map(async (docSnap, index) => {
          const curPct = Number(docSnap.data().percentage || 0)
          const extra = index === 0 ? sharePerPerson + remainder : sharePerPerson
          const updatedPct = curPct + extra
          return updateDoc(docSnap.ref, {
            percentage: updatedPct,
            myTarget: Math.round((groupTargetAmount * updatedPct) / 100),
          })
        })
      )
    }

    // Update requesting member
    await updateDoc(memberRef, {
      percentage: newPercentage,
      myTarget: Math.round((groupTargetAmount * newPercentage) / 100),
      status: 'ACCEPTED',
      changeRequest: deleteField(),
      respondedAt: serverTimestamp(),
    })
  },
}
