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

    const payload: Record<string, unknown> = {
      userId,
      name: data.name.trim(),
      amount: Number(data.amount),
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      categoryIcon: data.categoryIcon,
      dueDay: Math.min(31, Math.max(1, Number(data.dueDay))),
      autoDeduct: Boolean(data.autoDeduct),
      billType,
      paidTenor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (totalTenor !== undefined) payload.totalTenor = totalTenor
    if (totalPrincipal !== undefined) payload.totalPrincipal = totalPrincipal
    if (data.walletId) payload.walletId = data.walletId
    if (data.walletName) payload.walletName = data.walletName
    if (data.notes && data.notes.trim()) payload.notes = data.notes.trim()

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
      updatedAt: serverTimestamp(),
    }
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.amount !== undefined) payload.amount = Number(data.amount)
    if (data.categoryId !== undefined) payload.categoryId = data.categoryId
    if (data.categoryName !== undefined) payload.categoryName = data.categoryName
    if (data.categoryIcon !== undefined) payload.categoryIcon = data.categoryIcon
    if (data.dueDay !== undefined) payload.dueDay = Math.min(31, Math.max(1, Number(data.dueDay)))
    if (data.autoDeduct !== undefined) payload.autoDeduct = Boolean(data.autoDeduct)
    if (data.billType !== undefined) payload.billType = data.billType
    if (data.totalTenor !== undefined) payload.totalTenor = Number(data.totalTenor)
    if (data.paidTenor !== undefined) payload.paidTenor = Number(data.paidTenor)
    if (data.totalPrincipal !== undefined) payload.totalPrincipal = Number(data.totalPrincipal)
    if (data.walletId !== undefined) payload.walletId = data.walletId
    if (data.walletName !== undefined) payload.walletName = data.walletName
    if (data.notes !== undefined) payload.notes = data.notes
    if (data.lastProcessedMonth !== undefined) payload.lastProcessedMonth = data.lastProcessedMonth

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
   * SMART AUTO-DEDUCT GUARD:
   * Only debits and marks as paid if the target wallet has sufficient balance (balance >= bill.amount).
   * If balance is insufficient, auto-deduct is gracefully held without making the wallet negative.
   */
  async processDueRecurringBills(userId: string): Promise<number> {
    if (!userId) return 0

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthStr = `${currentYear}-${currentMonthNum}`
    const currentDay = now.getDate()

    const [bills, wallets] = await Promise.all([
      this.getUserRecurringBills(userId),
      walletService.getUserWallets(userId),
    ])
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
        // Find target wallet: configured wallet > first unlocked wallet > first wallet
        const targetWallet =
          wallets.find((w) => w.id === bill.walletId) ||
          wallets.find((w) => !w.isLocked) ||
          wallets[0]

        // Guard: Verify target wallet balance >= bill amount
        const currentBalance = Number(targetWallet?.balance) || 0
        if (!targetWallet || currentBalance < bill.amount) {
          console.warn(
            `[recurringService] Auto-deduct skipped for bill "${bill.name}": Insufficient balance in wallet "${targetWallet?.name || 'Unknown'}" (Balance: ${currentBalance}, Required: ${bill.amount})`
          )
          continue
        }

        try {
          await this.payBill(userId, bill, targetWallet.id, targetWallet.name)
          // Adjust in-memory balance to handle multiple bills processing in the same batch accurately
          targetWallet.balance = currentBalance - bill.amount
          processedCount++
        } catch (err) {
          console.error(`[recurringService] Error auto-processing bill ${bill.id}:`, err)
        }
      }
    }

    return processedCount
  },
}
