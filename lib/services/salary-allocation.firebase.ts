import { db } from '@/lib/firebase/config'
import {
  collection,
  addDoc,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { transactionService } from '@/lib/services/transaction.firebase'
import { walletService } from '@/lib/services/wallet.firebase'
import { savingsService } from '@/lib/services/savings.firebase'
import type { IncomeType, SalaryAllocationRecord } from '@/types'

export interface SalaryAllocationInput {
  incomeType?: IncomeType
  totalSalary: number
  primaryWalletId: string
  primaryWalletName: string
  // Allocation amounts
  operatingCashAmount: number // Kas Belanja Operasional / Uang Jajan
  lockedSavingsAmount?: number // Tabungan Beku / Dana Darurat (Pay Yourself First)
  lockedWalletId?: string
  lockedWalletName?: string
  goalsAllocation?: { goalId: string; goalName: string; amount: number }[]
  notes?: string
}

export const salaryAllocationService = {
  async executeAllocation(userId: string, input: SalaryAllocationInput): Promise<boolean> {
    if (!userId) throw new Error('Unauthorized')
    if (input.totalSalary <= 0) throw new Error('Nominal pemasukan harus lebih besar dari 0')

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
    const monthStr = `${now.getFullYear()}-${currentMonthNum}`
    const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
    const isStudent = input.incomeType === 'STUDENT_ALLOWANCE'
    const isFreelance = input.incomeType === 'FREELANCE_VARIABLE'

    const label = isStudent ? 'Uang Saku' : isFreelance ? 'Pemasukan Fleksibel' : 'Gaji'
    const categoryName = isStudent ? 'Uang Saku / Jajan' : isFreelance ? 'Pemasukan Proyek / Freelance' : 'Gaji Pokok / Payroll'
    const categoryIcon = isStudent ? '🎒' : isFreelance ? '⚡' : '💼'

    // 1. Record Income Transaction for Salary to Primary Wallet
    await transactionService.create(userId, {
      type: 'INCOME',
      amount: input.totalSalary,
      categoryId: isStudent ? 'allowance' : isFreelance ? 'freelance' : 'salary',
      categoryName,
      categoryIcon,
      description: `[${label} Masuk] Periode ${monthName}`,
      transactionDate: todayStr,
      walletId: input.primaryWalletId,
      walletName: input.primaryWalletName,
    })

    // 2. Transfer Pay Yourself First portion to Locked / Emergency Savings Wallet
    let finalLockedWalletId = input.lockedWalletId
    let finalLockedWalletName = input.lockedWalletName

    if (input.lockedSavingsAmount && input.lockedSavingsAmount > 0) {
      if (!finalLockedWalletId) {
        // Find existing locked wallet or auto-create one for the user
        const userWallets = await walletService.getUserWallets(userId)
        const existingLocked = userWallets.find((w) => w.isLocked)
        if (existingLocked) {
          finalLockedWalletId = existingLocked.id
          finalLockedWalletName = existingLocked.name
        } else {
          // Auto-create locked wallet
          const createdLocked = await walletService.createWallet(userId, {
            name: 'Tabungan Beku & Darurat',
            type: 'BANK',
            balance: 0,
            icon: '🔒',
            color: '#a855f7',
            isLocked: true,
          })
          finalLockedWalletId = createdLocked.id
          finalLockedWalletName = createdLocked.name
        }
      }

      if (finalLockedWalletId && finalLockedWalletId !== input.primaryWalletId) {
        await walletService.transferBetweenWallets(userId, {
          fromWalletId: input.primaryWalletId,
          toWalletId: finalLockedWalletId,
          amount: input.lockedSavingsAmount,
          date: todayStr,
          notes: `[Pay Yourself First] Alokasi Tabungan Beku ${monthName}`,
        })
      }
    }

    // 3. Deposit to active Savings Goals
    const finalGoalsAllocation = input.goalsAllocation || []
    if (finalGoalsAllocation.length > 0) {
      for (const item of finalGoalsAllocation) {
        if (item.amount > 0) {
          try {
            await savingsService.depositToGoal(userId, item.goalId, item.amount)
          } catch (err) {
            console.warn(`[salaryAllocation] Failed to allocate to goal ${item.goalId}:`, err)
          }
        }
      }
    }

    // 4. Save Record to `salary_allocations` collection
    const allocationPayload = {
      userId,
      monthStr,
      monthName,
      incomeType: input.incomeType || 'SALARIED',
      totalSalary: input.totalSalary,
      operatingAmount: input.operatingCashAmount,
      lockedAmount: input.lockedSavingsAmount || 0,
      goalsAmount: finalGoalsAllocation.reduce((s, g) => s + g.amount, 0),
      primaryWalletId: input.primaryWalletId,
      primaryWalletName: input.primaryWalletName,
      lockedWalletId: finalLockedWalletId || '',
      lockedWalletName: finalLockedWalletName || '',
      goalsAllocation: finalGoalsAllocation,
      notes: input.notes || '',
      allocatedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await addDoc(collection(db, 'salary_allocations'), allocationPayload)

    // 5. Update userProfile with lastAllocatedMonth only for Salaried users (to prevent double monthly salary)
    if (input.incomeType === 'SALARIED') {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        lastAllocatedMonth: monthStr,
        updatedAt: serverTimestamp(),
      })
    }

    return true
  },

  /**
   * Get all allocation history records for user.
   */
  async getUserAllocationHistory(userId: string): Promise<SalaryAllocationRecord[]> {
    if (!userId) return []

    try {
      const q = query(
        collection(db, 'salary_allocations'),
        where('userId', '==', userId)
      )

      const snapshot = await getDocs(q)
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as SalaryAllocationRecord[]

      // Sort by monthStr or allocatedAt desc
      return list.sort((a, b) => b.monthStr.localeCompare(a.monthStr))
    } catch (err) {
      console.error('[salaryAllocation] Error fetching history:', err)
      return []
    }
  },

  /**
   * Get allocation record for a specific month e.g. "2026-08".
   */
  async getAllocationForMonth(userId: string, monthStr: string): Promise<SalaryAllocationRecord | null> {
    if (!userId || !monthStr) return null

    try {
      const q = query(
        collection(db, 'salary_allocations'),
        where('userId', '==', userId),
        where('monthStr', '==', monthStr)
      )

      const snapshot = await getDocs(q)
      if (snapshot.empty) return null

      const firstDoc = snapshot.docs[0]
      return {
        id: firstDoc.id,
        ...firstDoc.data(),
      } as unknown as SalaryAllocationRecord
    } catch (err) {
      console.error('[salaryAllocation] Error fetching month allocation:', err)
      return null
    }
  },

  /**
   * Reset / Delete an allocation record to allow re-allocation with complete rollback.
   * Cleans up all related transactions (income, pay-yourself-first transfers, goal deposits),
   * reverts goal balances, and resyncs all wallet balances cleanly from the ledger.
   */
  async resetAllocationForMonth(userId: string, allocationId: string): Promise<boolean> {
    if (!userId) return false

    try {
      if (allocationId) {
        // 1. Get allocation details before deleting
        const allocDoc = await getDocs(
          query(collection(db, 'salary_allocations'), where('userId', '==', userId))
        )
        const recordDoc = allocDoc.docs.find((d) => d.id === allocationId)
        if (recordDoc) {
          const record = recordDoc.data() as SalaryAllocationRecord

          // Clean up all transactions generated by this allocation
          if (record.monthStr) {
            const txQuery = query(
              collection(db, 'transactions'),
              where('userId', '==', userId)
            )
            const txSnap = await getDocs(txQuery)
            for (const tDoc of txSnap.docs) {
              const tData = tDoc.data()
              const dateStr = typeof tData.transactionDate === 'string' ? tData.transactionDate : ''
              const isDateMatch = dateStr.startsWith(record.monthStr)
              const desc = typeof tData.description === 'string' ? tData.description : ''
              const isMonthNameMatch = record.monthName ? desc.includes(record.monthName) : false

              // A. Salary / Allowance / Freelance Income transaction
              const isIncomeMatch =
                tData.type === 'INCOME' &&
                (tData.categoryId === 'salary' ||
                  tData.categoryId === 'allowance' ||
                  tData.categoryId === 'freelance' ||
                  desc.includes('[Gaji Masuk]') ||
                  desc.includes('[Uang Saku Masuk]') ||
                  desc.includes('[Pemasukan Fleksibel Masuk]') ||
                  desc.includes('[Pemasukan Masuk]'))

              // B. Pay Yourself First Transfer transactions (both outflow from primary and inflow to locked)
              const isTransferMatch =
                tData.categoryId === 'transfer' &&
                (desc.includes('[Pay Yourself First]') ||
                  desc.includes('Alokasi Tabungan Beku') ||
                  desc.includes('Tabungan Beku & Darurat'))

              // C. Savings Goal allocation transactions
              const isGoalDepositMatch =
                tData.categoryId === 'savings_deposit' && desc.includes('[Celengan]')

              if ((isDateMatch || isMonthNameMatch) && (isIncomeMatch || isTransferMatch || isGoalDepositMatch)) {
                await deleteDoc(doc(db, 'transactions', tDoc.id))
              }
            }
          }

          // Revert Savings Goals balances if allocated
          if (record.goalsAllocation && Array.isArray(record.goalsAllocation)) {
            for (const item of record.goalsAllocation) {
              if (item.goalId && item.amount > 0) {
                try {
                  const gRef = doc(db, 'savings_goals', item.goalId)
                  await updateDoc(gRef, {
                    currentAmount: increment(-item.amount),
                    updatedAt: serverTimestamp(),
                  })
                } catch (gErr) {
                  console.warn(`[salaryAllocation] Failed to revert goal ${item.goalId}:`, gErr)
                }
              }
            }
          }

          // Delete the allocation record document
          await deleteDoc(doc(db, 'salary_allocations', allocationId))

          // Recalculate & synchronize all wallet balances cleanly from remaining ledger
          await walletService.syncAllWalletsFromTransactions(userId)
        }
      }

      // 2. Clear lastAllocatedMonth in user profile
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        lastAllocatedMonth: '',
        updatedAt: serverTimestamp(),
      })

      return true
    } catch (err) {
      console.error('[salaryAllocation] Error resetting allocation:', err)
      return false
    }
  },

  /**
   * Instantly unlock payroll if user profile state is desynced.
   */
  async unlockUserPayroll(userId: string): Promise<boolean> {
    if (!userId) return false
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        lastAllocatedMonth: '',
        updatedAt: serverTimestamp(),
      })
      return true
    } catch (err) {
      console.error('[salaryAllocation] Error unlocking payroll:', err)
      return false
    }
  },
}
