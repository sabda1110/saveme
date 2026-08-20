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
  serverTimestamp,
} from 'firebase/firestore'
import type { SavingsGoal } from '@/types'
import { transactionService } from '@/lib/services/transaction.firebase'
import { walletService } from '@/lib/services/wallet.firebase'

export interface CreateSavingsGoalDto {
  name: string
  targetAmount: number
  currentAmount?: number
  targetDate?: string // YYYY-MM-DD
  icon?: string
  color?: string
  notes?: string
}

export const savingsService = {
  async createGoal(
    userId: string,
    data: CreateSavingsGoalDto,
    walletId?: string,
    walletName?: string
  ): Promise<SavingsGoal> {
    if (!userId) throw new Error('Unauthorized')

    const initialCurrent = Number(data.currentAmount) || 0

    const payload = {
      userId,
      name: data.name.trim(),
      targetAmount: Number(data.targetAmount),
      currentAmount: initialCurrent,
      targetDate: data.targetDate || '',
      icon: data.icon || '🎯',
      color: data.color || 'emerald',
      notes: data.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'savings_goals'), payload)

    // If there is initial amount, record transaction and deduct wallet balance
    if (initialCurrent > 0) {
      try {
        if (walletId) {
          await walletService.adjustWalletBalance(userId, walletId, -initialCurrent)
        }

        const todayStr = new Date().toISOString().split('T')[0]
        await transactionService.create(userId, {
          type: 'EXPENSE',
          amount: initialCurrent,
          categoryId: 'savings_deposit',
          categoryName: 'Alokasi Tabungan',
          categoryIcon: data.icon || '🎯',
          description: `[Celengan] Saldo Awal: ${data.name.trim()}`,
          transactionDate: todayStr,
          walletId,
          walletName,
        })
      } catch (err) {
        console.error('[savingsService] Error recording initial deposit tx:', err)
      }
    }

    return {
      id: docRef.id,
      ...payload,
    } as unknown as SavingsGoal
  },

  async getUserGoals(userId: string): Promise<SavingsGoal[]> {
    if (!userId) throw new Error('Unauthorized')

    try {
      const q = query(
        collection(db, 'savings_goals'),
        where('userId', '==', userId)
      )

      const snapshot = await getDocs(q)
      const goals = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as SavingsGoal[]

      // Sort by targetDate or createdAt
      return goals.sort((a, b) => {
        if (a.targetDate && b.targetDate) {
          return a.targetDate.localeCompare(b.targetDate)
        }
        return 0
      })
    } catch (error) {
      console.error('[savingsService] Error fetching goals:', error)
      return []
    }
  },

  async updateGoal(
    userId: string,
    goalId: string,
    data: Partial<CreateSavingsGoalDto>
  ): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'savings_goals', goalId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Target tabungan tidak ditemukan')
    }

    const existing = snapshot.data()
    if (existing.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    const payload: Record<string, unknown> = {
      ...data,
      updatedAt: serverTimestamp(),
    }

    if (data.targetAmount !== undefined) {
      payload.targetAmount = Number(data.targetAmount)
    }
    if (data.currentAmount !== undefined) {
      payload.currentAmount = Number(data.currentAmount)
    }

    await updateDoc(docRef, payload)
    return true
  },

  /**
   * Deposit money into a savings goal.
   * Automatically creates an expense transaction and deducts wallet balance,
   * while the money is safely stored in this goal.
   */
  async depositToGoal(
    userId: string,
    goalId: string,
    amount: number,
    walletId?: string,
    walletName?: string
  ): Promise<number> {
    if (!userId) throw new Error('Unauthorized')
    if (amount <= 0) throw new Error('Nominal setor harus lebih dari 0')

    const docRef = doc(db, 'savings_goals', goalId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Target tabungan tidak ditemukan')
    }

    const existing = snapshot.data()
    if (existing.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    const newCurrent = Number(existing.currentAmount || 0) + Number(amount)

    // 1. Update Goal
    await updateDoc(docRef, {
      currentAmount: newCurrent,
      updatedAt: serverTimestamp(),
    })

    // 2. Deduct Wallet Balance
    if (walletId) {
      await walletService.adjustWalletBalance(userId, walletId, -amount)
    }

    // 3. Record Transaction
    const todayStr = new Date().toISOString().split('T')[0]
    await transactionService.create(userId, {
      type: 'EXPENSE',
      amount: Number(amount),
      categoryId: 'savings_deposit',
      categoryName: 'Alokasi Tabungan',
      categoryIcon: existing.icon || '🎯',
      description: `[Celengan] Setor ke: ${existing.name}`,
      transactionDate: todayStr,
      walletId,
      walletName,
    })

    return newCurrent
  },

  /**
   * Withdraw money from a savings goal.
   * Automatically creates an income transaction and credits money back to wallet.
   */
  async withdrawFromGoal(
    userId: string,
    goalId: string,
    amount: number,
    walletId?: string,
    walletName?: string
  ): Promise<number> {
    if (!userId) throw new Error('Unauthorized')
    if (amount <= 0) throw new Error('Nominal tarik harus lebih dari 0')

    const docRef = doc(db, 'savings_goals', goalId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Target tabungan tidak ditemukan')
    }

    const existing = snapshot.data()
    if (existing.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    const current = Number(existing.currentAmount || 0)
    if (amount > current) {
      throw new Error('Saldo tabungan tidak mencukupi untuk ditarik')
    }

    const newCurrent = Math.max(0, current - Number(amount))

    // 1. Update Goal
    await updateDoc(docRef, {
      currentAmount: newCurrent,
      updatedAt: serverTimestamp(),
    })

    // 2. Increment Wallet Balance
    if (walletId) {
      await walletService.adjustWalletBalance(userId, walletId, amount)
    }

    // 3. Record Transaction
    const todayStr = new Date().toISOString().split('T')[0]
    await transactionService.create(userId, {
      type: 'INCOME',
      amount: Number(amount),
      categoryId: 'savings_withdraw',
      categoryName: 'Tarik Tabungan',
      categoryIcon: '💵',
      description: `[Celengan] Tarik dari: ${existing.name}`,
      transactionDate: todayStr,
      walletId,
      walletName,
    })

    return newCurrent
  },

  async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'savings_goals', goalId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Target tabungan tidak ditemukan')
    }

    const data = snapshot.data()
    if (data.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    await deleteDoc(docRef)
    return true
  },
}
