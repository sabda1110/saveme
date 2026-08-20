---
name: database
description: Database design and management guidelines for SaveMe using Google Cloud Firestore. Use this skill when designing collections, writing Firestore queries, managing composite indexes, defining security rules, and seeding data.
---

# SaveMe Database Skill (Cloud Firestore)

## Technology Stack

- **Database:** Google Cloud Firestore (NoSQL Document Store)
- **SDK:** Official Firebase Web SDK (`firebase/firestore`, `firebase/auth`)
- **Client:** Singleton in `saveme/lib/firebase/config.ts`

---

## Firebase / Firestore Singleton

Always use the singleton to prevent duplicate app initialization in Next.js:

```typescript
// lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

---

## Firestore Collections Design

### 1. `users` Collection
- Path: `users/{userId}`
- Document Fields:
  - `uid`: string (matches Firebase Auth UID)
  - `email`: string
  - `name`: string
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

### 2. `categories` Collection
- Path: `categories/{categoryId}`
- Document Fields:
  - `id`: string
  - `name`: string (e.g. 'Food', 'Salary')
  - `icon`: string (Emoji, e.g. '🍔')
  - `type`: `'INCOME' | 'EXPENSE' | 'BOTH'`

### 3. `transactions` Collection
- Path: `transactions/{transactionId}`
- Document Fields:
  - `id`: string (doc ID)
  - `userId`: string (**CRITICAL: FK to users.uid**)
  - `categoryId`: string
  - `categoryName`: string
  - `categoryIcon`: string
  - `type`: `'INCOME' | 'EXPENSE'`
  - `amount`: number
  - `description`: string (optional)
  - `transactionDate`: string (ISO `YYYY-MM-DD`)
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

---

## Critical Security Rule: userId Isolation

**Every query on `transactions` MUST include `where('userId', '==', user.uid)`.**

```typescript
// ✅ CORRECT — userId constraint enforced
const q = query(
  collection(db, 'transactions'),
  where('userId', '==', userId),
  orderBy('transactionDate', 'desc')
)

// ❌ FORBIDDEN — queries without userId filter!
const q = query(collection(db, 'transactions'))
```

---

## Aggregation Queries for Dashboard

```typescript
// Summary calculation helper in service
export async function getDashboardSummary(userId: string, dateFrom?: string, dateTo?: string) {
  let q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId)
  )

  if (dateFrom && dateTo) {
    q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('transactionDate', '>=', dateFrom),
      where('transactionDate', '<=', dateTo)
    )
  }

  const snapshot = await getDocs(q)
  const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction))

  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpense

  return {
    totalIncome,
    totalExpense,
    balance,
    transactions,
  }
}
```

---

## Seed Data (Categories)

```typescript
// lib/services/category.firebase.ts
export const DEFAULT_CATEGORIES = [
  { name: 'Food',           icon: '🍔', type: 'EXPENSE' },
  { name: 'Transportation', icon: '🚗', type: 'EXPENSE' },
  { name: 'Shopping',       icon: '🛍️', type: 'EXPENSE' },
  { name: 'Bills',          icon: '📄', type: 'EXPENSE' },
  { name: 'Entertainment',  icon: '🎬', type: 'EXPENSE' },
  { name: 'Health',         icon: '💊', type: 'EXPENSE' },
  { name: 'Education',      icon: '📚', type: 'EXPENSE' },
  { name: 'Salary',         icon: '💼', type: 'INCOME' },
  { name: 'Business',       icon: '📈', type: 'INCOME' },
  { name: 'Other',          icon: '📦', type: 'BOTH' },
]
```

---

## MCP Tools Used

| Task | Tool |
|---|---|
| Read database config | `view_file lib/firebase/config.ts` |
| Read services | `view_file lib/services/transaction.firebase.ts` |
| Research Firestore SDK | `search_web` |
| Update rules/docs | `write_to_file` |
