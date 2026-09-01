import { db } from '@/lib/firebase/config'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import type { Category } from '@/types'

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  // 🍔 Makanan, Minuman & Sembako
  { name: 'Food', icon: '🍔', type: 'EXPENSE' },
  { name: 'Coffee & Cafe', icon: '☕', type: 'EXPENSE' },
  { name: 'Groceries', icon: '🛒', type: 'EXPENSE' },

  // 🚗 Transportasi & Mobilitas
  { name: 'Transportation', icon: '🚗', type: 'EXPENSE' },
  { name: 'Fuel', icon: '⛽', type: 'EXPENSE' },

  // 📄 Tagihan, Cicilan & Asuransi
  { name: 'Bills', icon: '📄', type: 'EXPENSE' },
  { name: 'Installments & Debt', icon: '💳', type: 'EXPENSE' },
  { name: 'Insurance & BPJS', icon: '🛡️', type: 'EXPENSE' },

  // 🛍️ Belanja & Gaya Hidup
  { name: 'Shopping', icon: '🛍️', type: 'EXPENSE' },
  { name: 'Self-Care & Beauty', icon: '✨', type: 'EXPENSE' },
  { name: 'Entertainment', icon: '🎬', type: 'EXPENSE' },
  { name: 'Hobby & Sport', icon: '🏸', type: 'EXPENSE' },
  { name: 'Travel & Vacation', icon: '✈️', type: 'EXPENSE' },
  { name: 'Pet Care', icon: '🐱', type: 'EXPENSE' },

  // 👶 Keluarga, Sosial & Religi
  { name: 'Family & Kids', icon: '👶', type: 'EXPENSE' },
  { name: 'Zakat & Donation', icon: '🕌', type: 'EXPENSE' },
  { name: 'Gifts & Kondangan', icon: '🎁', type: 'EXPENSE' },
  { name: 'Health', icon: '💊', type: 'EXPENSE' },
  { name: 'Education', icon: '📚', type: 'EXPENSE' },
  { name: 'Investments', icon: '📊', type: 'EXPENSE' },

  // 💼 Pemasukan (Income)
  { name: 'Salary', icon: '💼', type: 'INCOME' },
  { name: 'Freelance & Projects', icon: '💻', type: 'INCOME' },
  { name: 'Business', icon: '📈', type: 'INCOME' },
  { name: 'Bonus & THR', icon: '🎉', type: 'INCOME' },
  { name: 'Investment Dividends', icon: '🪙', type: 'INCOME' },
  { name: 'Allowance & Gifts', icon: '🧧', type: 'INCOME' },

  // 📦 Lain-lain
  { name: 'Other', icon: '📦', type: 'BOTH' },
]

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const snapshot = await getDocs(collection(db, 'categories'))
      if (snapshot.empty) {
        // Return full defaults with slugified IDs if collection is empty
        return DEFAULT_CATEGORIES.map((cat, i) => ({
          id: `cat-${i + 1}`,
          ...cat,
        }))
      }

      const existingCategories = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      
      // If existing DB has fewer categories than current defaults, merge them seamlessly
      const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()))
      const missingDefaults = DEFAULT_CATEGORIES.filter(
        (def) => !existingNames.has(def.name.toLowerCase())
      ).map((cat, i) => ({
        id: `cat-ext-${i + 1}`,
        ...cat,
      }))

      return [...existingCategories, ...missingDefaults]
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
