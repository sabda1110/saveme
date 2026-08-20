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
import type { QuickTemplate, CreateQuickTemplateDto, UpdateQuickTemplateDto, Wallet } from '@/types'
import { transactionService } from './transaction.firebase'
import { walletService } from './wallet.firebase'

export const quickTemplateService = {
  /**
   * Fetch all quick templates created by the user.
   * Returns empty array if user has not created any templates yet.
   */
  async getUserTemplates(userId: string): Promise<QuickTemplate[]> {
    if (!userId) throw new Error('User ID is required')

    try {
      const q = query(collection(db, 'quick_templates'), where('userId', '==', userId))
      const snapshot = await getDocs(q)

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          amount: Number(data.amount) || 0,
          icon: data.icon || '⚡',
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          categoryIcon: data.categoryIcon || '📦',
          walletId: data.walletId || '',
          walletName: data.walletName || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as QuickTemplate
      })
    } catch (err) {
      console.error('[quickTemplateService] Error fetching templates:', err)
      return []
    }
  },

  /**
   * Create a new quick template.
   */
  async createTemplate(userId: string, data: CreateQuickTemplateDto): Promise<QuickTemplate> {
    if (!userId) throw new Error('User ID is required')
    if (!data.name?.trim()) throw new Error('Nama template wajib diisi')
    if (!data.amount || data.amount <= 0) throw new Error('Nominal template harus lebih besar dari 0')

    const payload = {
      userId,
      name: data.name.trim(),
      amount: Number(data.amount),
      icon: data.icon || '⚡',
      categoryId: data.categoryId || 'other',
      categoryName: data.categoryName || 'Other',
      categoryIcon: data.categoryIcon || '📦',
      walletId: data.walletId || '',
      walletName: data.walletName || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'quick_templates'), payload)
    return {
      id: docRef.id,
      ...payload,
    } as unknown as QuickTemplate
  },

  /**
   * Update an existing quick template.
   */
  async updateTemplate(
    userId: string,
    templateId: string,
    data: UpdateQuickTemplateDto
  ): Promise<void> {
    if (!userId) throw new Error('User ID is required')

    const docRef = doc(db, 'quick_templates', templateId)
    const existing = await getDoc(docRef)

    if (!existing.exists() || existing.data().userId !== userId) {
      throw new Error('Template tidak ditemukan atau tidak memiliki akses')
    }

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.amount !== undefined) payload.amount = Number(data.amount)
    if (data.icon !== undefined) payload.icon = data.icon
    if (data.categoryId !== undefined) payload.categoryId = data.categoryId
    if (data.categoryName !== undefined) payload.categoryName = data.categoryName
    if (data.categoryIcon !== undefined) payload.categoryIcon = data.categoryIcon
    if (data.walletId !== undefined) payload.walletId = data.walletId
    if (data.walletName !== undefined) payload.walletName = data.walletName

    await updateDoc(docRef, payload)
  },

  /**
   * Delete a quick template.
   */
  async deleteTemplate(userId: string, templateId: string): Promise<void> {
    if (!userId) throw new Error('User ID is required')

    const docRef = doc(db, 'quick_templates', templateId)
    const existing = await getDoc(docRef)

    if (!existing.exists() || existing.data().userId !== userId) {
      throw new Error('Template tidak ditemukan atau tidak memiliki akses')
    }

    await deleteDoc(docRef)
  },

  /**
   * Execute a quick template transaction directly.
   * Records the expense transaction and decrements wallet balance immediately.
   */
  async executeTemplate(
    userId: string,
    template: QuickTemplate,
    selectedWallet?: Wallet
  ): Promise<void> {
    if (!userId) throw new Error('User ID is required')

    const todayStr = new Date().toISOString().split('T')[0]

    // 1. Create transaction record
    await transactionService.create(userId, {
      type: 'EXPENSE',
      amount: template.amount,
      categoryId: template.categoryId,
      categoryName: template.categoryName,
      categoryIcon: template.categoryIcon,
      description: template.name,
      transactionDate: todayStr,
      walletId: selectedWallet?.id || template.walletId,
      walletName: selectedWallet?.name || template.walletName,
    })

    // 2. Adjust wallet balance if wallet is specified
    const targetWalletId = selectedWallet?.id || template.walletId
    if (targetWalletId) {
      await walletService.adjustWalletBalance(userId, targetWalletId, -template.amount)
    }
  },
}
