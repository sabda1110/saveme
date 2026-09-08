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
import type {
  Debt,
  DebtStatus,
  CreateDebtDto,
  UpdateDebtDto,
  AddDebtRepaymentDto,
  DebtRepayment,
  DebtAddition,
  AddDebtLoanDto,
} from '@/types'
import { walletService } from '@/lib/services/wallet.firebase'
import { transactionService } from '@/lib/services/transaction.firebase'

export const debtService = {
  /**
   * Fetch all debts & loans for the authenticated user.
   */
  async getUserDebts(userId: string): Promise<Debt[]> {
    if (!userId) throw new Error('Unauthorized: User ID is required')

    const q = query(collection(db, 'debts'), where('userId', '==', userId))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return []
    }

    const debts: Debt[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        userId: data.userId,
        type: data.type || 'LENT',
        personName: data.personName || '',
        personRelationship: data.personRelationship || 'OTHER',
        personContact: data.personContact || '',
        totalAmount: Number(data.totalAmount) || 0,
        paidAmount: Number(data.paidAmount) || 0,
        status: data.status || 'UNPAID',
        startDate: data.startDate || '',
        dueDate: data.dueDate || undefined,
        isFlexible: Boolean(data.isFlexible),
        notes: data.notes || '',
        walletId: data.walletId || undefined,
        walletName: data.walletName || undefined,
        repayments: Array.isArray(data.repayments) ? data.repayments : [],
        additions: Array.isArray(data.additions) ? data.additions : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Debt
    })

    // Sort descending by startDate in memory
    return debts.sort((a, b) => {
      const dateA = a.startDate || ''
      const dateB = b.startDate || ''
      return dateB.localeCompare(dateA)
    })
  },

  /**
   * Create a new debt or loan record.
   */
  async create(userId: string, data: CreateDebtDto): Promise<Debt> {
    if (!userId) throw new Error('Unauthorized: User ID is required')
    if (!data.personName?.trim()) throw new Error('Nama peminjam / pihak terkait wajib diisi')
    if (!data.totalAmount || Number(data.totalAmount) <= 0) {
      throw new Error('Nominal pinjaman harus lebih besar dari Rp 0')
    }
    if (!data.startDate) throw new Error('Tanggal pinjaman wajib ditentukan')

    const totalAmount = Number(data.totalAmount)
    const isFlexible = Boolean(data.isFlexible || !data.dueDate)
    const dueDate = isFlexible ? undefined : data.dueDate

    const payload: Record<string, unknown> = {
      userId,
      type: data.type,
      personName: data.personName.trim(),
      personRelationship: data.personRelationship || 'OTHER',
      personContact: data.personContact?.trim() || '',
      totalAmount,
      paidAmount: 0,
      status: 'UNPAID',
      startDate: data.startDate,
      dueDate: dueDate || null,
      isFlexible,
      notes: data.notes?.trim() || '',
      walletId: data.walletId || null,
      walletName: data.walletName || null,
      repayments: [],
      additions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'debts'), payload)

    // Optional: Synchronize wallet balance and record a transaction
    if (data.walletId && data.affectWalletBalance) {
      try {
        if (data.type === 'LENT') {
          // Money left user's wallet to lend to someone
          await walletService.adjustWalletBalance(userId, data.walletId, -totalAmount)
          await transactionService.create(
            userId,
            {
              type: 'EXPENSE',
              amount: totalAmount,
              categoryId: 'pinjaman-diberikan',
              categoryName: 'Peminjaman Uang / Piutang',
              categoryIcon: '🤝',
              description: `Pinjaman diberikan ke ${data.personName.trim()}${data.notes ? ` (${data.notes})` : ''}`,
              transactionDate: data.startDate,
              walletId: data.walletId,
              walletName: data.walletName,
            },
            { skipWalletAdjustment: true }
          )
        } else {
          // User borrowed money from someone into user's wallet
          await walletService.adjustWalletBalance(userId, data.walletId, totalAmount)
          await transactionService.create(
            userId,
            {
              type: 'INCOME',
              amount: totalAmount,
              categoryId: 'pinjaman-diterima',
              categoryName: 'Peminjaman Uang / Hutang',
              categoryIcon: '📥',
              description: `Pinjaman diterima dari ${data.personName.trim()}${data.notes ? ` (${data.notes})` : ''}`,
              transactionDate: data.startDate,
              walletId: data.walletId,
              walletName: data.walletName,
            },
            { skipWalletAdjustment: true }
          )
        }
      } catch (syncErr) {
        console.error('[debtService] Warning: Failed to sync wallet transaction:', syncErr)
      }
    }

    return {
      id: docRef.id,
      userId,
      ...data,
      totalAmount,
      paidAmount: 0,
      status: 'UNPAID',
      dueDate,
      isFlexible,
      repayments: [],
    } as Debt
  },

  /**
   * Add a repayment (installment or full payoff) to an existing debt.
   */
  async addRepayment(
    userId: string,
    debtId: string,
    repayment: AddDebtRepaymentDto
  ): Promise<{ updatedDebt: Debt; newlyPaid: boolean }> {
    if (!userId) throw new Error('Unauthorized')
    if (!repayment.amount || Number(repayment.amount) <= 0) {
      throw new Error('Nominal pembayaran harus lebih besar dari Rp 0')
    }

    const docRef = doc(db, 'debts', debtId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Catatan pinjaman tidak ditemukan')
    }

    const debtData = snapshot.data() as Debt
    if (debtData.userId !== userId) {
      throw new Error('Akses ditolak: Dokumen bukan milik Anda')
    }

    const repaymentAmount = Number(repayment.amount)
    const existingRepayments: DebtRepayment[] = Array.isArray(debtData.repayments)
      ? debtData.repayments
      : []

    const newRepayment: DebtRepayment = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amount: repaymentAmount,
      repaymentDate: repayment.repaymentDate || new Date().toISOString().split('T')[0],
      walletId: repayment.walletId,
      walletName: repayment.walletName,
      notes: repayment.notes?.trim(),
      createdAt: new Date().toISOString(),
    }

    const updatedRepayments = [...existingRepayments, newRepayment]
    const updatedPaidAmount = Number(debtData.paidAmount || 0) + repaymentAmount
    const newlyPaid = updatedPaidAmount >= debtData.totalAmount
    const updatedStatus = newlyPaid ? 'PAID' : 'PARTIAL'

    await updateDoc(docRef, {
      paidAmount: updatedPaidAmount,
      status: updatedStatus,
      repayments: updatedRepayments,
      updatedAt: serverTimestamp(),
    })

    // Optional: Synchronize wallet balance and record a transaction
    if (repayment.walletId && repayment.affectWalletBalance) {
      try {
        if (debtData.type === 'LENT') {
          // Money returned to user's wallet (INCOME)
          await walletService.adjustWalletBalance(userId, repayment.walletId, repaymentAmount)
          await transactionService.create(
            userId,
            {
              type: 'INCOME',
              amount: repaymentAmount,
              categoryId: 'pelunasan-piutang',
              categoryName: 'Pelunasan Piutang',
              categoryIcon: '💰',
              description: `Penerimaan cicilan/pelunasan dari ${debtData.personName}${repayment.notes ? ` (${repayment.notes})` : ''}`,
              transactionDate: newRepayment.repaymentDate,
              walletId: repayment.walletId,
              walletName: repayment.walletName,
            },
            { skipWalletAdjustment: true }
          )
        } else {
          // User paid off debt from user's wallet (EXPENSE)
          await walletService.adjustWalletBalance(userId, repayment.walletId, -repaymentAmount)
          await transactionService.create(
            userId,
            {
              type: 'EXPENSE',
              amount: repaymentAmount,
              categoryId: 'pelunasan-hutang',
              categoryName: 'Pelunasan Hutang',
              categoryIcon: '💸',
              description: `Pembayaran cicilan/pelunasan ke ${debtData.personName}${repayment.notes ? ` (${repayment.notes})` : ''}`,
              transactionDate: newRepayment.repaymentDate,
              walletId: repayment.walletId,
              walletName: repayment.walletName,
            },
            { skipWalletAdjustment: true }
          )
        }
      } catch (syncErr) {
        console.error('[debtService] Warning: Failed to sync wallet repayment:', syncErr)
      }
    }

    const updatedDebt: Debt = {
      ...debtData,
      id: debtId,
      paidAmount: updatedPaidAmount,
      status: updatedStatus,
      repayments: updatedRepayments,
    }

    return { updatedDebt, newlyPaid }
  },

  /**
   * Add additional borrowing amount (top-up loan / pinjam lagi) to an existing debt.
   */
  async addLoan(userId: string, debtId: string, data: AddDebtLoanDto): Promise<Debt> {
    if (!userId) throw new Error('Unauthorized')
    if (!data.amount || Number(data.amount) <= 0) {
      throw new Error('Nominal pinjaman tambahan harus lebih besar dari Rp 0')
    }

    const docRef = doc(db, 'debts', debtId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Catatan pinjaman tidak ditemukan')
    }

    const debtData = snapshot.data() as Debt
    if (debtData.userId !== userId) {
      throw new Error('Akses ditolak: Dokumen bukan milik Anda')
    }

    const loanAmount = Number(data.amount)
    const existingAdditions: DebtAddition[] = Array.isArray(debtData.additions)
      ? debtData.additions
      : []

    const newAddition: DebtAddition = {
      id: `add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amount: loanAmount,
      additionDate: data.additionDate || new Date().toISOString().split('T')[0],
      walletId: data.walletId,
      walletName: data.walletName,
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    }

    const updatedAdditions = [...existingAdditions, newAddition]
    const updatedTotalAmount = Number(debtData.totalAmount || 0) + loanAmount
    const currentPaid = Number(debtData.paidAmount || 0)

    // Recalculate status based on new grand total
    let updatedStatus: DebtStatus = 'UNPAID'
    if (currentPaid >= updatedTotalAmount) {
      updatedStatus = 'PAID'
    } else if (currentPaid > 0) {
      updatedStatus = 'PARTIAL'
    } else {
      updatedStatus = 'UNPAID'
    }

    await updateDoc(docRef, {
      totalAmount: updatedTotalAmount,
      status: updatedStatus,
      additions: updatedAdditions,
      updatedAt: serverTimestamp(),
    })

    // Optional: Synchronize wallet balance and record a transaction
    if (data.walletId && data.affectWalletBalance) {
      try {
        if (debtData.type === 'LENT') {
          // Additional money lent out (EXPENSE)
          await walletService.adjustWalletBalance(userId, data.walletId, -loanAmount)
          await transactionService.create(
            userId,
            {
              type: 'EXPENSE',
              amount: loanAmount,
              categoryId: 'pinjaman-diberikan',
              categoryName: 'Peminjaman Uang / Piutang',
              categoryIcon: '🤝',
              description: `Tambahan pinjaman ke ${debtData.personName}${data.notes ? ` (${data.notes})` : ''}`,
              transactionDate: newAddition.additionDate,
              walletId: data.walletId,
              walletName: data.walletName,
            },
            { skipWalletAdjustment: true }
          )
        } else {
          // Additional money borrowed in (INCOME)
          await walletService.adjustWalletBalance(userId, data.walletId, loanAmount)
          await transactionService.create(
            userId,
            {
              type: 'INCOME',
              amount: loanAmount,
              categoryId: 'pinjaman-diterima',
              categoryName: 'Peminjaman Uang / Hutang',
              categoryIcon: '📥',
              description: `Tambahan pinjaman dari ${debtData.personName}${data.notes ? ` (${data.notes})` : ''}`,
              transactionDate: newAddition.additionDate,
              walletId: data.walletId,
              walletName: data.walletName,
            },
            { skipWalletAdjustment: true }
          )
        }
      } catch (syncErr) {
        console.error('[debtService] Warning: Failed to sync wallet addition:', syncErr)
      }
    }

    return {
      ...debtData,
      id: debtId,
      totalAmount: updatedTotalAmount,
      status: updatedStatus,
      additions: updatedAdditions,
    }
  },

  /**
   * Update details of an existing debt record.
   */
  async update(userId: string, debtId: string, data: UpdateDebtDto): Promise<void> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'debts', debtId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Catatan pinjaman tidak ditemukan')
    }

    const existing = snapshot.data()
    if (existing.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (data.personName !== undefined) payload.personName = data.personName.trim()
    if (data.personRelationship !== undefined) payload.personRelationship = data.personRelationship
    if (data.personContact !== undefined) payload.personContact = data.personContact.trim()
    if (data.notes !== undefined) payload.notes = data.notes.trim()
    if (data.isFlexible !== undefined) payload.isFlexible = Boolean(data.isFlexible)
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate || null

    await updateDoc(docRef, payload)
  },

  /**
   * Delete a debt record.
   */
  async delete(userId: string, debtId: string): Promise<void> {
    if (!userId) throw new Error('Unauthorized')

    const docRef = doc(db, 'debts', debtId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      throw new Error('Catatan pinjaman tidak ditemukan')
    }

    const existing = snapshot.data()
    if (existing.userId !== userId) {
      throw new Error('Akses ditolak')
    }

    await deleteDoc(docRef)
  },
}
