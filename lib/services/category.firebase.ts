import { db } from '@/lib/firebase/config'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import type { Category, CategoryType } from '@/types'

export interface CustomCategoryInput {
  name: string
  icon: string
  type: CategoryType
}

export interface GetCategoriesOptions {
  includeHidden?: boolean
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', icon: '🍔', type: 'EXPENSE' },
  { name: 'Coffee & Cafe', icon: '☕', type: 'EXPENSE' },
  { name: 'Groceries', icon: '🛒', type: 'EXPENSE' },
  { name: 'Transportation', icon: '🚗', type: 'EXPENSE' },
  { name: 'Fuel', icon: '⛽', type: 'EXPENSE' },
  { name: 'Bills', icon: '📄', type: 'EXPENSE' },
  { name: 'Installments & Debt', icon: '💳', type: 'EXPENSE' },
  { name: 'Insurance & BPJS', icon: '🛡️', type: 'EXPENSE' },
  { name: 'Shopping', icon: '🛍️', type: 'EXPENSE' },
  { name: 'Self-Care & Beauty', icon: '✨', type: 'EXPENSE' },
  { name: 'Entertainment', icon: '🎬', type: 'EXPENSE' },
  { name: 'Hobby & Sport', icon: '🏸', type: 'EXPENSE' },
  { name: 'Travel & Vacation', icon: '✈️', type: 'EXPENSE' },
  { name: 'Pet Care', icon: '🐱', type: 'EXPENSE' },
  { name: 'Family & Kids', icon: '👶', type: 'EXPENSE' },
  { name: 'Zakat & Donation', icon: '🕌', type: 'EXPENSE' },
  { name: 'Gifts & Kondangan', icon: '🎁', type: 'EXPENSE' },
  { name: 'Health', icon: '💊', type: 'EXPENSE' },
  { name: 'Education', icon: '📚', type: 'EXPENSE' },
  { name: 'Investments', icon: '📊', type: 'EXPENSE' },
  { name: 'Salary', icon: '💼', type: 'INCOME' },
  { name: 'Freelance & Projects', icon: '💻', type: 'INCOME' },
  { name: 'Business', icon: '📈', type: 'INCOME' },
  { name: 'Bonus & THR', icon: '🎉', type: 'INCOME' },
  { name: 'Investment Dividends', icon: '🪙', type: 'INCOME' },
  { name: 'Allowance & Gifts', icon: '🧧', type: 'INCOME' },
  { name: 'Other', icon: '📦', type: 'BOTH' },
]

export const categoryService = {
  async getCategories(userId?: string, options?: GetCategoriesOptions): Promise<Category[]> {
    try {
      const snapshot = await getDocs(collection(db, 'categories'))
      let baseCategories: Category[] = []

      if (snapshot.empty) {
        baseCategories = DEFAULT_CATEGORIES.map((cat, i) => ({
          id: `cat-${i + 1}`,
          ...cat,
          isCustom: false,
        }))
      } else {
        const existingCategories = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          isCustom: false,
        } as Category))

        const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()))
        const missingDefaults = DEFAULT_CATEGORIES.filter(
          (def) => !existingNames.has(def.name.toLowerCase())
        ).map((cat, i) => ({
          id: `cat-ext-${i + 1}`,
          ...cat,
          isCustom: false,
        }))

        baseCategories = [...existingCategories, ...missingDefaults]
      }

      if (!userId) {
        return baseCategories
      }

      let hiddenCategoryIds: string[] = []
      try {
        const userSnap = await getDoc(doc(db, 'users', userId))
        if (userSnap.exists()) {
          hiddenCategoryIds = userSnap.data()?.hiddenCategoryIds || []
        }
      } catch (err) {
        console.error('[categoryService] Error fetching user hidden categories:', err)
      }

      const customCategories = await this.getCustomCategories(userId)

      if (options?.includeHidden) {
        const mappedBase = baseCategories.map((cat) => ({
          ...cat,
          isHidden: hiddenCategoryIds.includes(cat.id),
        }))
        return [...customCategories, ...mappedBase]
      }

      const activeBase = baseCategories.filter((cat) => !hiddenCategoryIds.includes(cat.id))
      return [...customCategories, ...activeBase]
    } catch (error) {
      console.error('[categoryService] Error fetching categories:', error)
      return DEFAULT_CATEGORIES.map((cat, i) => ({
        id: `cat-${i + 1}`,
        ...cat,
        isCustom: false,
      }))
    }
  },

  async getCustomCategories(userId: string): Promise<Category[]> {
    if (!userId) return []
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'custom_categories'))
      return snap.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          name: data.name,
          icon: data.icon,
          type: data.type,
          isCustom: true,
          userId,
        } as Category
      })
    } catch (error) {
      console.error('[categoryService] Error fetching custom categories:', error)
      return []
    }
  },

  async createCustomCategory(userId: string, input: CustomCategoryInput): Promise<Category> {
    if (!userId) throw new Error('Unauthorized: User ID is required')
    if (!input.name?.trim()) throw new Error('Nama kategori wajib diisi')

    const docRef = await addDoc(collection(db, 'users', userId, 'custom_categories'), {
      name: input.name.trim(),
      icon: input.icon?.trim() || '📦',
      type: input.type || 'EXPENSE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return {
      id: docRef.id,
      name: input.name.trim(),
      icon: input.icon?.trim() || '📦',
      type: input.type || 'EXPENSE',
      isCustom: true,
      userId,
    }
  },

  async updateCustomCategory(
    userId: string,
    categoryId: string,
    input: Partial<CustomCategoryInput>
  ): Promise<void> {
    if (!userId) throw new Error('Unauthorized: User ID is required')
    if (!categoryId) throw new Error('Category ID is required')

    const docRef = doc(db, 'users', userId, 'custom_categories', categoryId)
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (input.name !== undefined) payload.name = input.name.trim()
    if (input.icon !== undefined) payload.icon = input.icon.trim()
    if (input.type !== undefined) payload.type = input.type

    await updateDoc(docRef, payload)
  },

  async deleteCustomCategory(userId: string, categoryId: string): Promise<void> {
    if (!userId) throw new Error('Unauthorized: User ID is required')
    if (!categoryId) throw new Error('Category ID is required')

    const docRef = doc(db, 'users', userId, 'custom_categories', categoryId)
    await deleteDoc(docRef)
  },

  async hideDefaultCategory(userId: string, categoryId: string): Promise<void> {
    if (!userId) throw new Error('Unauthorized: User ID is required')
    if (!categoryId) throw new Error('Category ID is required')

    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      hiddenCategoryIds: arrayUnion(categoryId),
      updatedAt: serverTimestamp(),
    })
  },

  async unhideDefaultCategory(userId: string, categoryId: string): Promise<void> {
    if (!userId) throw new Error('Unauthorized: User ID is required')
    if (!categoryId) throw new Error('Category ID is required')

    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      hiddenCategoryIds: arrayRemove(categoryId),
      updatedAt: serverTimestamp(),
    })
  },

  async resetHiddenCategories(userId: string): Promise<void> {
    if (!userId) throw new Error('Unauthorized: User ID is required')

    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      hiddenCategoryIds: [],
      updatedAt: serverTimestamp(),
    })
  },

  async seedCategories(): Promise<void> {
    try {
      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const cat = DEFAULT_CATEGORIES[i]
        const docRef = doc(db, 'categories', `cat-${i + 1}`)
        await setDoc(docRef, cat, { merge: true })
      }
    } catch (error) {
      console.error('[categoryService] Error seeding categories:', error)
    }
  },
}
