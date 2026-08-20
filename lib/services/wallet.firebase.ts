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
import type { Wallet, CreateWalletDto, UpdateWalletDto, TransferWalletDto } from '@/types'
import { transactionService } from './transaction.firebase'

export const walletService = {
  /**
   * Fetch all wallets for a user.
   * Auto-initializes default "Dompet Tunai" if user has no wallets yet.
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    if (!userId) throw new Error('User ID is required')

    const q = query(collection(db, 'wallets'), where('userId', '==', userId))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      // Auto-initialize default cash wallet
      const defaultWallet = await this.createWallet(userId, {
        name: 'Dompet Tunai (Kas)',
        type: 'CASH',
        balance: 0,
        icon: '💵',
        color: '#22c55e',
      })
      return [defaultWallet]
    }

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        userId: data.userId,
        name: data.name,
        type: data.type || 'CASH',
        balance: Number(data.balance) || 0,
        accountNumber: data.accountNumber || '',
        icon: data.icon || '💳',
        color: data.color || '#22c55e',
        isDefault: data.isDefault ?? false,
        isLocked: data.isLocked ?? false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Wallet
    })
  },

  /**
   * Create a new wallet.
   */
  async createWallet(userId: string, data: CreateWalletDto): Promise<Wallet> {
    if (!userId) throw new Error('User ID is required')
    if (!data.name?.trim()) throw new Error('Nama kantong / rekening wajib diisi')

    const isLocked = Boolean(data.isLocked)

    const docRef = await addDoc(collection(db, 'wallets'), {
      userId,
      name: data.name.trim(),
      type: data.type,
      balance: Number(data.balance) || 0,
      accountNumber: data.accountNumber?.trim() || '',
      icon: data.icon || '💳',
      color: data.color || '#22c55e',
      isDefault: false,
      isLocked,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return {
      id: docRef.id,
      userId,
      ...data,
      isLocked,
      balance: Number(data.balance) || 0,
    }
  },

  /**
   * Update an existing wallet.
   */
  async updateWallet(userId: string, walletId: string, data: UpdateWalletDto): Promise<void> {
    if (!userId) throw new Error('User ID is required')

    const docRef = doc(db, 'wallets', walletId)
    const existing = await getDoc(docRef)

    if (!existing.exists() || existing.data().userId !== userId) {
      throw new Error('Kantong rekening tidak ditemukan atau tidak memiliki akses')
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (data.name !== undefined) updatePayload.name = data.name.trim()
    if (data.type !== undefined) updatePayload.type = data.type
    if (data.balance !== undefined) updatePayload.balance = Number(data.balance)
    if (data.accountNumber !== undefined) updatePayload.accountNumber = data.accountNumber.trim()
    if (data.icon !== undefined) updatePayload.icon = data.icon
    if (data.color !== undefined) updatePayload.color = data.color
    if (data.isLocked !== undefined) updatePayload.isLocked = Boolean(data.isLocked)

    await updateDoc(docRef, updatePayload)
  },

  /**
   * Delete a wallet.
   */
  async deleteWallet(userId: string, walletId: string): Promise<void> {
    if (!userId) throw new Error('User ID is required')

    const docRef = doc(db, 'wallets', walletId)
    const existing = await getDoc(docRef)

    if (!existing.exists() || existing.data().userId !== userId) {
      throw new Error('Kantong rekening tidak ditemukan atau tidak memiliki akses')
    }

    await deleteDoc(docRef)
  },

  /**
   * Adjust balance of a specific wallet (e.g. on transaction create or delete).
   */
  async adjustWalletBalance(userId: string, walletId: string, deltaAmount: number): Promise<void> {
    if (!userId || !walletId || deltaAmount === 0) return

    try {
      const docRef = doc(db, 'wallets', walletId)
      const snap = await getDoc(docRef)
      if (snap.exists() && snap.data().userId === userId) {
        const currentBal = Number(snap.data().balance) || 0
        const newBal = currentBal + deltaAmount
        await updateDoc(docRef, {
          balance: newBal,
          updatedAt: serverTimestamp(),
        })
      }
    } catch (err) {
      console.error('[wallet] Error adjusting wallet balance:', err)
    }
  },

  /**
   * Transfer funds between two wallets.
   * Decrements source wallet, increments destination wallet, and records history.
   */
  async transferBetweenWallets(userId: string, payload: TransferWalletDto): Promise<void> {
    if (!userId) throw new Error('User ID is required')
    if (payload.fromWalletId === payload.toWalletId) {
      throw new Error('Kantong asal dan tujuan tidak boleh sama')
    }
    if (payload.amount <= 0) {
      throw new Error('Nominal transfer harus lebih besar dari Rp 0')
    }

    const fromRef = doc(db, 'wallets', payload.fromWalletId)
    const toRef = doc(db, 'wallets', payload.toWalletId)

    const [fromSnap, toSnap] = await Promise.all([getDoc(fromRef), getDoc(toRef)])

    if (!fromSnap.exists() || fromSnap.data().userId !== userId) {
      throw new Error('Kantong asal tidak valid')
    }
    if (!toSnap.exists() || toSnap.data().userId !== userId) {
      throw new Error('Kantong tujuan tidak valid')
    }

    const fromData = fromSnap.data()
    const toData = toSnap.data()

    const fromBal = Number(fromData.balance) || 0
    const toBal = Number(toData.balance) || 0

    // Update balances
    await Promise.all([
      updateDoc(fromRef, {
        balance: fromBal - payload.amount,
        updatedAt: serverTimestamp(),
      }),
      updateDoc(toRef, {
        balance: toBal + payload.amount,
        updatedAt: serverTimestamp(),
      }),
    ])

    // Record transfer in transactions for complete history tracking
    const todayStr = payload.date || new Date().toISOString().split('T')[0]
    const notesText = payload.notes ? ` (${payload.notes})` : ''

    await Promise.all([
      // Outflow record
      transactionService.create(userId, {
        type: 'EXPENSE',
        amount: payload.amount,
        categoryId: 'transfer',
        categoryName: 'Transfer Antar Kantong',
        categoryIcon: '🔄',
        description: `Transfer ke ${toData.name}${notesText}`,
        transactionDate: todayStr,
        walletId: payload.fromWalletId,
        walletName: fromData.name,
      }),
      // Inflow record
      transactionService.create(userId, {
        type: 'INCOME',
        amount: payload.amount,
        categoryId: 'transfer',
        categoryName: 'Transfer Antar Kantong',
        categoryIcon: '🔄',
        description: `Terima dari ${fromData.name}${notesText}`,
        transactionDate: todayStr,
        walletId: payload.toWalletId,
        walletName: toData.name,
      }),
    ])
  },
}
