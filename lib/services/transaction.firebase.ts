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
import { walletService } from '@/lib/services/wallet.firebase'
import type { Transaction, TransactionType, DashboardSummary } from '@/types'

export interface CreateTransactionDto {
  categoryId: string
  categoryName: string
  categoryIcon: string
  type: TransactionType
  amount: number
  description?: string
  transactionDate: string // YYYY-MM-DD
  walletId?: string
  walletName?: string
}

export const transactionService = {
  async create(userId: string, data: CreateTransactionDto): Promise<Transaction> {
    if (!userId) throw new Error('Unauthorized: User ID is required')

    const payload = {
      userId,
      ...data,
      amount: Number(data.amount),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'transactions'), payload)
    return {
      id: docRef.id,
      ...payload,
    } as unknown as Transaction
  },

  async update(
    userId: string,
    transactionId: string,
    data: Partial<CreateTransactionDto>
  ): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'transactions', transactionId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Transaksi tidak ditemukan')
    }

    const existing = snapshot.data()
    if (existing.userId !== userId) {
      throw new Error('Akses ditolak: Dokumen bukan milik Anda')
    }

    const oldType = existing.type
    const oldAmount = Number(existing.amount) || 0
    const oldWalletId = existing.walletId

    const newType = data.type || oldType
    const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount
    const newWalletId = data.walletId !== undefined ? data.walletId : oldWalletId

    // 1. Adjust wallet balances if needed
    try {
      if (oldWalletId && oldWalletId === newWalletId) {
        // Same wallet: calculate net delta
        const oldEffect = oldType === 'INCOME' ? oldAmount : -oldAmount
        const newEffect = newType === 'INCOME' ? newAmount : -newAmount
        const netDelta = newEffect - oldEffect
        if (netDelta !== 0) {
          await walletService.adjustWalletBalance(userId, oldWalletId, netDelta)
        }
      } else {
        // Different wallets: revert old, apply new
        if (oldWalletId) {
          const revertOld = oldType === 'INCOME' ? -oldAmount : oldAmount
          await walletService.adjustWalletBalance(userId, oldWalletId, revertOld)
        }
        if (newWalletId) {
          const applyNew = newType === 'INCOME' ? newAmount : -newAmount
          await walletService.adjustWalletBalance(userId, newWalletId, applyNew)
        }
      }
    } catch (err) {
      console.warn('[transactionService.update] Failed to adjust wallet balance during update:', err)
    }

    const payload: Record<string, unknown> = {
      ...data,
      updatedAt: serverTimestamp(),
    }
    if (data.amount !== undefined) {
      payload.amount = Number(data.amount)
    }

    await updateDoc(docRef, payload)
    return true
  },

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    if (!userId) throw new Error('Unauthorized: User ID is required')

    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      )

      const snapshot = await getDocs(q)
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as Transaction[]

      // Clean client-side sort by transactionDate descending
      return items.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    } catch (error) {
      console.error('[transactionService] Error fetching transactions:', error)
      return []
    }
  },

  async delete(userId: string, transactionId: string): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'transactions', transactionId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Transaksi tidak ditemukan')
    }

    const data = snapshot.data()
    if (data.userId !== userId) {
      throw new Error('Akses ditolak: Dokumen bukan milik Anda')
    }

    // 1. Revert wallet balance if walletId exists
    if (data.walletId && typeof data.amount === 'number' && data.amount > 0) {
      try {
        if (data.type === 'INCOME') {
          // If income is deleted, deduct from wallet
          await walletService.adjustWalletBalance(userId, data.walletId, -data.amount)
        } else if (data.type === 'EXPENSE') {
          // If expense is deleted, refund back to wallet
          await walletService.adjustWalletBalance(userId, data.walletId, data.amount)
        }
      } catch (err) {
        console.warn('[transactionService] Failed to adjust wallet balance upon transaction deletion:', err)
      }
    }

    // 2. If deleted transaction was a salary or allowance income, unlock payroll
    const isSalaryOrAllowance =
      data.type === 'INCOME' &&
      (data.categoryId === 'salary' ||
        data.categoryId === 'allowance' ||
        (typeof data.description === 'string' &&
          (data.description.includes('[Gaji Masuk]') || data.description.includes('[Uang Saku Masuk]'))))

    if (isSalaryOrAllowance && data.transactionDate) {
      try {
        const monthStr = data.transactionDate.substring(0, 7) // e.g. "2026-08"
        // Delete matching salary_allocations record
        const allocQuery = query(
          collection(db, 'salary_allocations'),
          where('userId', '==', userId),
          where('monthStr', '==', monthStr)
        )
        const allocSnap = await getDocs(allocQuery)
        for (const aDoc of allocSnap.docs) {
          await deleteDoc(doc(db, 'salary_allocations', aDoc.id))
        }

        // Reset lastAllocatedMonth in user profile
        const userRef = doc(db, 'users', userId)
        await updateDoc(userRef, {
          lastAllocatedMonth: '',
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        console.warn('[transactionService] Failed to clean salary allocation upon transaction deletion:', err)
      }
    }

    // 3. Delete the transaction document
    await deleteDoc(docRef)
    return true
  },

  async getDashboardSummary(userId: string, dateFrom?: string, dateTo?: string): Promise<DashboardSummary> {
    const allTransactions = await this.getUserTransactions(userId)

    const filtered = allTransactions.filter((t) => {
      if (dateFrom && t.transactionDate < dateFrom) return false
      if (dateTo && t.transactionDate > dateTo) return false
      return true
    })

    const totalIncome = filtered
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0)

    const totalExpense = filtered
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0)

    const balance = totalIncome - totalExpense
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0

    // Group expense by category
    const categoryTotals: Record<string, { name: string; icon: string; amount: number }> = {}

    filtered
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        if (!categoryTotals[t.categoryId]) {
          categoryTotals[t.categoryId] = {
            name: t.categoryName,
            icon: t.categoryIcon,
            amount: 0,
          }
        }
        categoryTotals[t.categoryId].amount += t.amount
      })

    const categoryBreakdown = Object.values(categoryTotals).map((cat) => ({
      ...cat,
      percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
    }))

    return {
      balance,
      totalIncome,
      totalExpense,
      savingsRate,
      transactions: filtered,
      categoryBreakdown: categoryBreakdown.sort((a, b) => b.amount - a.amount),
    }
  },
}
