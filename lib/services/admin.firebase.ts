import { db } from '@/lib/firebase/config'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import type { UserProfile, UserRole, SystemStats } from '@/types'
import { getUserProfile } from '@/lib/auth/firebase-auth'

export const adminService = {
  async verifyAdmin(adminUid: string): Promise<UserProfile> {
    const profile = await getUserProfile(adminUid)
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      throw new Error('Akses Ditolak: Anda tidak memiliki izin Admin')
    }
    return profile
  },

  async getSystemStats(adminUid: string): Promise<SystemStats> {
    await this.verifyAdmin(adminUid)

    const [usersSnapshot, txSnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'transactions')),
    ])

    const totalUsers = usersSnapshot.size
    const totalTransactions = txSnapshot.size

    let totalVolume = 0
    txSnapshot.docs.forEach((d) => {
      const data = d.data()
      totalVolume += Number(data.amount || 0)
    })

    const users = usersSnapshot.docs.map((d) => d.data() as UserProfile)

    return {
      totalUsers,
      totalTransactions,
      totalVolume,
      recentUsers: users.slice(0, 10),
    }
  },

  async getAllUsers(adminUid: string): Promise<UserProfile[]> {
    await this.verifyAdmin(adminUid)
    const snapshot = await getDocs(collection(db, 'users'))
    return snapshot.docs.map((d) => d.data() as UserProfile)
  },

  async updateUserRole(adminUid: string, targetUid: string, newRole: UserRole): Promise<void> {
    const admin = await this.verifyAdmin(adminUid)
    if (admin.role !== 'SUPER_ADMIN') {
      throw new Error('Hanya Super Admin yang dapat mengubah hak akses pengguna')
    }

    const docRef = doc(db, 'users', targetUid)
    await updateDoc(docRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    })
  },
}
