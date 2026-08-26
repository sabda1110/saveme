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

    // 2. Add All Invitees (PENDING)
    await Promise.all(
      invitees.map(async (inv) => {
        const myTarget = Math.round((totalTarget * inv.percentage) / 100)
        return addDoc(collection(db, 'group_savings_members'), {
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
          if (group.status !== 'ACTIVE') return null

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

  // ── Get groups created by user ────────────────────────────────────────────

  async getCreatedGroups(userId: string): Promise<GroupSavings[]> {
    if (!userId) return []
    try {
      const q = query(
        collection(db, 'group_savings'),
        where('createdBy', '==', userId)
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupSavings[]
    } catch {
      return []
    }
  },
}
