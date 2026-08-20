import { db } from '@/lib/firebase/config'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import type { Category } from '@/types'

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', icon: '🍔', type: 'EXPENSE' },
  { name: 'Transportation', icon: '🚗', type: 'EXPENSE' },
  { name: 'Shopping', icon: '🛍️', type: 'EXPENSE' },
  { name: 'Bills', icon: '📄', type: 'EXPENSE' },
  { name: 'Entertainment', icon: '🎬', type: 'EXPENSE' },
  { name: 'Health', icon: '💊', type: 'EXPENSE' },
  { name: 'Education', icon: '📚', type: 'EXPENSE' },
  { name: 'Salary', icon: '💼', type: 'INCOME' },
  { name: 'Business', icon: '📈', type: 'INCOME' },
  { name: 'Other', icon: '📦', type: 'BOTH' },
]

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const snapshot = await getDocs(collection(db, 'categories'))
      if (snapshot.empty) {
        // Return defaults with generated IDs if collection is empty
        return DEFAULT_CATEGORIES.map((cat, i) => ({
          id: `cat-${i + 1}`,
          ...cat,
        }))
      }
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
    } catch (error) {
      console.error('[categoryService] Error fetching categories:', error)
      return DEFAULT_CATEGORIES.map((cat, i) => ({
        id: `cat-${i + 1}`,
        ...cat,
      }))
    }
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
