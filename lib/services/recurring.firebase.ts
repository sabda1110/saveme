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
import type { RecurringBill, BillType } from '@/types'
import { transactionService } from '@/lib/services/transaction.firebase'
import { walletService } from '@/lib/services/wallet.firebase'

export interface CreateRecurringBillDto {
  name: string
  amount: number
  categoryId: string
  categoryName: string
  categoryIcon: string
  dueDay: number // 1 to 31
  autoDeduct: boolean
  billType?: BillType
  walletId?: string
  walletName?: string
  totalTenor?: number
  paidTenor?: number
  totalPrincipal?: number
  notes?: string
}

export const recurringService = {
  async create(userId: string, data: CreateRecurringBillDto): Promise<RecurringBill> {
    if (!userId) throw new Error('Unauthorized: User ID is required')

    const billType: BillType = data.billType || 'RECURRING'
    const totalTenor = data.totalTenor ? Math.max(1, Number(data.totalTenor)) : undefined
    const paidTenor = data.paidTenor ? Math.max(0, Number(data.paidTenor)) : 0
    const totalPrincipal = data.totalPrincipal
      ? Number(data.totalPrincipal)
      : totalTenor
      ? Number(data.amount) * totalTenor
      : undefined

    const payload = {
      userId,
      ...data,
      billType,
      amount: Number(data.amount),
      dueDay: Math.min(31, Math.max(1, Number(data.dueDay))),
      autoDeduct: Boolean(data.autoDeduct),
      totalTenor,
      paidTenor,
      totalPrincipal,
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
    data: Partial<CreateRecurringBillDto> & { lastProcessedMonth?: string; paidTenor?: number }
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
    if (data.totalTenor !== undefined) {
      payload.totalTenor = Number(data.totalTenor)
    }
    if (data.paidTenor !== undefined) {
      payload.paidTenor = Number(data.paidTenor)
    }
    if (data.totalPrincipal !== undefined) {
      payload.totalPrincipal = Number(data.totalPrincipal)
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
        billType: 'RECURRING' as BillType,
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
   * Pay a bill manually or automatically, recording expense and updating tenor/wallet.
   */
  async payBill(
    userId: string,
    bill: RecurringBill,
    chosenWalletId?: string,
    chosenWalletName?: string
  ): Promise<boolean> {
    if (!userId || !bill?.id) throw new Error('Unauthorized or invalid bill')

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthStr = `${now.getFullYear()}-${currentMonthNum}`

    const isInstallment = bill.billType === 'INSTALLMENT'
    const nextPaidTenor = (bill.paidTenor || 0) + 1
    const totalTenor = bill.totalTenor || 1

    const txDesc = isInstallment
      ? `[Cicilan ${nextPaidTenor}/${totalTenor}] ${bill.name}`
      : `[Pembayaran Tagihan] ${bill.name}`

    const targetWalletId = chosenWalletId || bill.walletId
    const targetWalletName = chosenWalletName || bill.walletName

    // 1. Record expense transaction
    await transactionService.create(userId, {
      type: 'EXPENSE',
      amount: bill.amount,
      categoryId: bill.categoryId,
      categoryName: bill.categoryName,
      categoryIcon: bill.categoryIcon,
      description: txDesc,
      transactionDate: todayStr,
      walletId: targetWalletId,
      walletName: targetWalletName,
    })

    // 2. Debit wallet balance if walletId is present
    if (targetWalletId) {
      try {
        await walletService.adjustWalletBalance(userId, targetWalletId, -bill.amount)
      } catch (err) {
        console.warn(`[recurringService] Failed to deduct wallet ${targetWalletId}:`, err)
      }
    }

    // 3. Update bill status & tenor
    const updatePayload: { lastProcessedMonth: string; paidTenor?: number } = {
      lastProcessedMonth: currentMonthStr,
    }
    if (isInstallment) {
      updatePayload.paidTenor = nextPaidTenor
    }

    await this.update(userId, bill.id, updatePayload)
    return true
  },

  /**
   * Automatically processes due recurring bills for the current month.
   */
  async processDueRecurringBills(userId: string): Promise<number> {
    if (!userId) return 0

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthStr = `${currentYear}-${currentMonthNum}`
    const currentDay = now.getDate()

    const bills = await this.getUserRecurringBills(userId)
    let processedCount = 0

    for (const bill of bills) {
      // Check if installment is already finished
      if (bill.billType === 'INSTALLMENT' && bill.totalTenor && (bill.paidTenor || 0) >= bill.totalTenor) {
        continue
      }

      if (
        bill.autoDeduct &&
        currentDay >= bill.dueDay &&
        bill.lastProcessedMonth !== currentMonthStr
      ) {
        try {
          await this.payBill(userId, bill)
          processedCount++
        } catch (err) {
          console.error(`[recurringService] Error auto-processing bill ${bill.id}:`, err)
        }
      }
    }

    return processedCount
  },
}
