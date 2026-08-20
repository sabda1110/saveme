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
import type { RecurringBill } from '@/types'
import { transactionService } from '@/lib/services/transaction.firebase'

export interface CreateRecurringBillDto {
  name: string
  amount: number
  categoryId: string
  categoryName: string
  categoryIcon: string
  dueDay: number // 1 to 31
  autoDeduct: boolean
}

export const recurringService = {
  async create(userId: string, data: CreateRecurringBillDto): Promise<RecurringBill> {
    if (!userId) throw new Error('Unauthorized: User ID is required')

    const payload = {
      userId,
      ...data,
      amount: Number(data.amount),
      dueDay: Math.min(31, Math.max(1, Number(data.dueDay))),
      autoDeduct: Boolean(data.autoDeduct),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'recurring_bills'), payload)
    return {
      id: docRef.id,
      ...payload,
    } as unknown as RecurringBill
  },

  async update(
    userId: string,
    billId: string,
    data: Partial<CreateRecurringBillDto> & { lastProcessedMonth?: string }
  ): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'recurring_bills', billId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Tagihan tidak ditemukan')
    }

    const existing = snapshot.data()
    if (existing.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    const payload: Record<string, unknown> = {
      ...data,
      updatedAt: serverTimestamp(),
    }
    if (data.amount !== undefined) {
      payload.amount = Number(data.amount)
    }
    if (data.dueDay !== undefined) {
      payload.dueDay = Math.min(31, Math.max(1, Number(data.dueDay)))
    }

    await updateDoc(docRef, payload)
    return true
  },

  async getUserRecurringBills(userId: string): Promise<RecurringBill[]> {
    if (!userId) throw new Error('Unauthorized')

    try {
      const q = query(
        collection(db, 'recurring_bills'),
        where('userId', '==', userId)
      )

      const snapshot = await getDocs(q)
      const bills = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as RecurringBill[]

      // Sort by dueDay ascending (earliest in the month first)
      return bills.sort((a, b) => a.dueDay - b.dueDay)
    } catch (error) {
      console.error('[recurringService] Error fetching recurring bills:', error)
      return []
    }
  },

  async delete(userId: string, billId: string): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'recurring_bills', billId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Tagihan rutin tidak ditemukan')
    }

    const data = snapshot.data()
    if (data.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    await deleteDoc(docRef)
    return true
  },

  /**
   * Automatically processes due recurring bills for the current month.
   * If today's day >= bill.dueDay and lastProcessedMonth !== currentMonth,
   * creates an expense transaction and stamps the bill as processed.
   */
  async processDueRecurringBills(userId: string): Promise<number> {
    if (!userId) return 0

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthStr = `${currentYear}-${currentMonthNum}` // "YYYY-MM"
    const currentDay = now.getDate()

    const bills = await this.getUserRecurringBills(userId)
    let processedCount = 0

    for (const bill of bills) {
      if (
        bill.autoDeduct &&
        currentDay >= bill.dueDay &&
        bill.lastProcessedMonth !== currentMonthStr
      ) {
        try {
          // Format transaction date (use actual due date in current month)
          const dueDayStr = String(bill.dueDay).padStart(2, '0')
          const txDate = `${currentMonthStr}-${dueDayStr}`

          // 1. Create the auto-deducted expense transaction
          await transactionService.create(userId, {
            type: 'EXPENSE',
            amount: bill.amount,
            categoryId: bill.categoryId,
            categoryName: bill.categoryName,
            categoryIcon: bill.categoryIcon,
            description: `[Auto-Cicilan] ${bill.name}`,
            transactionDate: txDate <= now.toISOString().split('T')[0] ? txDate : now.toISOString().split('T')[0],
          })

          // 2. Mark this bill as processed for current month
          const billDocRef = doc(db, 'recurring_bills', bill.id)
          await updateDoc(billDocRef, {
            lastProcessedMonth: currentMonthStr,
            updatedAt: serverTimestamp(),
          })

          processedCount++
        } catch (err) {
          console.error(`[recurringService] Error processing bill ${bill.id}:`, err)
        }
      }
    }

    return processedCount
  },
}
