# Playbook: Add Page

Gunakan playbook ini setiap kali menambah halaman baru di Next.js App Router.

---

## Kapan Digunakan
- Menambah route/halaman baru
- Menambah layout untuk grup route
- Menambah loading, error, atau not-found UI

## Prasyarat
- Sudah menjalankan `start-feature.md` dan mendapat approval
- Sudah membaca `.agents/skills/frontend/SKILL.md`
- Sudah membaca `.agents/skills/design/SKILL.md`

---

## Steps

### Step 1 — Tentukan Route Group

```
app/
├── (auth)/         ← Halaman publik (login, register) — tanpa sidebar
│   ├── layout.tsx  ← Centered layout, no nav
│   ├── login/page.tsx
│   └── register/page.tsx
│
└── (app)/          ← Halaman protected — dengan sidebar
    ├── layout.tsx  ← Auth guard + sidebar
    ├── dashboard/page.tsx
    ├── transactions/
    │   ├── page.tsx
    │   └── [id]/page.tsx
    └── profile/page.tsx
```

- [ ] Apakah halaman ini memerlukan autentikasi? → `(app)/`
- [ ] Apakah halaman ini publik? → `(auth)/`

---

### Step 2 — Tentukan Server vs Client Component

**Default: Server Component** (tidak perlu directive apapun)

```typescript
// Server Component — default, tidak perlu 'use client'
export default async function DashboardPage() {
  // Bisa fetch data langsung, async/await supported
  const session = await getSession()
  const data = await dashboardService.getSummary(session.userId)
  return <DashboardView data={data} />
}
```

Gunakan **Client Component** hanya jika halaman atau bagiannya membutuhkan:
- `useState` / `useReducer`
- `useEffect`
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`localStorage`, `window`)

```typescript
'use client' // ← hanya kalau benar-benar perlu
export function InteractiveWidget() {
  const [open, setOpen] = useState(false)
  // ...
}
```

**Pattern yang dianjurkan:** Buat page sebagai Server Component, ekstrak bagian interaktif menjadi Client Component tersendiri.

---

### Step 3 — Buat File Page

```typescript
// app/(app)/[feature]/page.tsx

import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { featureService } from '@/lib/services/feature.service'
import { FeatureView } from '@/components/features/[feature]/FeatureView'

export const metadata = {
  title: 'Feature Name — SaveMe',
  description: 'Deskripsi singkat halaman ini',
}

export default async function FeaturePage() {
  // Auth guard (atau handle di middleware)
  const session = await getSession()
  if (!session) redirect('/login')

  // Fetch data di server
  const data = await featureService.findMany({ userId: session.userId })

  return (
    <main>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Feature Name</h1>
      <FeatureView data={data} />
    </main>
  )
}
```

- [ ] Ada `export const metadata` dengan title yang benar
- [ ] Title format: `[Nama Halaman] — SaveMe`
- [ ] Auth check ada (atau dikover middleware)
- [ ] Data fetch di server, bukan di client

---

### Step 4 — Buat Loading UI (Opsional tapi Dianjurkan)

```typescript
// app/(app)/[feature]/loading.tsx
export default function FeatureLoading() {
  return (
    <div className="space-y-4">
      {/* Skeleton yang mirip dengan layout halaman asli */}
      <div className="h-8 bg-[#2d3348] rounded w-48 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-[#1a1d27] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] Loading skeleton mirip dengan layout real
- [ ] Gunakan `animate-pulse` untuk shimmer effect
- [ ] Warna skeleton: `bg-[#2d3348]`

---

### Step 5 — Buat Error UI (Opsional)

```typescript
// app/(app)/[feature]/error.tsx
'use client' // Error boundaries harus client component

export default function FeatureError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold text-slate-200 mb-2">
        Something went wrong
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        Failed to load this page. Please try again.
      </p>
      <button
        onClick={reset}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
```

---

### Step 6 — Buat/Update Layout (Jika Diperlukan)

Layout hanya dibuat jika ada shared UI untuk grup route ini.

```typescript
// app/(app)/layout.tsx — sudah ada, jangan duplikasi
// Cukup pastikan layout yang ada sudah mencakup kebutuhan halaman baru
```

---

### Step 7 — Buat Feature Components

Komponen untuk halaman ini letakkan di:
```
components/features/[feature]/
├── FeatureView.tsx        ← Komponen utama (bisa Server)
├── FeatureCard.tsx        ← Kartu item
├── FeatureForm.tsx        ← Form (Client Component)
└── FeatureFilter.tsx      ← Filter/search (Client Component)
```

**Rules komponen:**
- [ ] Satu komponen per file
- [ ] Nama file = nama komponen (PascalCase)
- [ ] Max ~150 baris per komponen
- [ ] Tidak ada business logic di komponen

---

### Step 8 — Design Checklist

- [ ] Background page: `bg-[#0f1117]` (via layout)
- [ ] Card background: `bg-[#1a1d27] border border-[#2d3348] rounded-xl`
- [ ] Heading: `text-slate-100 font-bold`
- [ ] Secondary text: `text-slate-400`
- [ ] Income: `text-green-400`
- [ ] Expense: `text-red-400`
- [ ] CTA button: `bg-green-500 hover:bg-green-600`
- [ ] Responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- [ ] Empty state ada jika data bisa kosong
- [ ] Loading state ada (via `loading.tsx` atau skeleton)

---

### Step 9 — Verify

```bash
# Start dev server
npm run dev

# Buka halaman di browser
# Test: authenticated user bisa akses
# Test: unauthenticated user di-redirect ke /login
# Test: halaman responsive di mobile (375px)
# Test: dark mode tampil benar
```

- [ ] Halaman tampil tanpa error
- [ ] Metadata title benar di tab browser
- [ ] Auth guard berfungsi
- [ ] Responsive di mobile
- [ ] Empty state dan loading state tampil

---

### Step 10 — Jalankan finish-feature.md

Lanjutkan ke `finish-feature.md`.
