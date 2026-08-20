---
name: backend
description: Backend & service guidelines for SaveMe using Firebase Authentication, Cloud Firestore, Zod validation, and React Context. Use this skill when building services, authentication flows, data manipulation, and business logic.
---

# SaveMe Backend & Auth Skill

## Architecture Overview

SaveMe utilizes **Firebase (Firebase Auth & Cloud Firestore)** combined with Next.js client/server service layers.

```
React Component (Organisms / Pages)
    ↓  Invokes service with authenticated user
Service Layer (lib/services/*.firebase.ts)
    ↓  Validates with Zod, manipulates data
Firebase SDK (lib/firebase/config.ts)
    ↓  Cloud Firestore / Firebase Auth
Google Cloud Infrastructure
```

---

## Firebase Authentication Pattern

```typescript
// lib/auth/firebase-auth.ts
import { auth, db } from '@/lib/firebase/config'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function registerWithEmail(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await updateProfile(user, { displayName: name })

  // Create user profile in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return user
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function logoutUser() {
  await signOut(auth)
}
```

---

## Service Layer Pattern (Firestore)

```typescript
// lib/services/transaction.firebase.ts
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
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import type { Transaction, TransactionType } from '@/types'

export interface CreateTransactionInput {
  categoryId: string
  categoryName: string
  categoryIcon: string
  type: TransactionType
  amount: number
  description?: string
  transactionDate: string
}

export const transactionService = {
  async create(userId: string, input: CreateTransactionInput) {
    if (!userId) throw new Error('Unauthorized')

    const docRef = await addDoc(collection(db, 'transactions'), {
      userId,
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return { id: docRef.id, userId, ...input }
  },

  async findMany(userId: string, dateFrom?: string, dateTo?: string) {
    if (!userId) throw new Error('Unauthorized')

    let q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('transactionDate', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
  },

  async delete(userId: string, id: string) {
    const docRef = doc(db, 'transactions', id)
    const existing = await getDoc(docRef)

    if (!existing.exists() || existing.data().userId !== userId) {
      throw new Error('Unauthorized or not found')
    }

    await deleteDoc(docRef)
    return true
  },
}
```

---

## Validation with Zod

```typescript
// lib/validations/transaction.schema.ts
import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Nominal harus lebih besar dari 0').max(999_999_999_999),
  categoryId: z.string().min(1, 'Pilih kategori'),
  categoryName: z.string().min(1),
  categoryIcon: z.string().min(1),
  description: z.string().max(500).optional(),
  transactionDate: z.string().min(1, 'Pilih tanggal transaksi'),
})

export type TransactionInput = z.infer<typeof transactionSchema>
```

---

## Critical Security Rule

**`userId` MUST ALWAYS be retrieved from the authenticated Firebase user (`user.uid`). NEVER accept unverified user ID from client requests.**
