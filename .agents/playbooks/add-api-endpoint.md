# Playbook: Add API Endpoint

Gunakan playbook ini setiap kali menambah atau memodifikasi API endpoint (Route Handler).

---

## Kapan Digunakan
- Menambah endpoint baru di `app/api/`
- Memodifikasi endpoint yang sudah ada
- Menambah method baru (GET, POST, PATCH, DELETE) ke route yang ada

## Prasyarat
- Sudah menjalankan `start-feature.md` dan mendapat approval
- Sudah membaca `.agents/skills/backend/SKILL.md`
- Sudah membaca `saveme-project/API.md`

---

## Steps

### Step 1 — Tentukan Lokasi File

```
app/api/
├── auth/
│   ├── register/route.ts   → POST /api/auth/register
│   ├── login/route.ts      → POST /api/auth/login
│   └── logout/route.ts     → POST /api/auth/logout
├── me/route.ts             → GET/PATCH /api/me
├── transactions/
│   ├── route.ts            → GET /api/transactions, POST /api/transactions
│   └── [id]/route.ts       → GET/PATCH/DELETE /api/transactions/:id
├── categories/route.ts     → GET /api/categories
└── dashboard/
    ├── summary/route.ts
    ├── expense-by-category/route.ts
    └── income-vs-expense/route.ts
```

- [ ] Tentukan path URL endpoint
- [ ] Tentukan apakah perlu file baru atau menambah method ke file yang ada

---

### Step 2 — Buat/Update Zod Validation Schema

Lokasi: `lib/validations/`

```typescript
// lib/validations/transaction.schema.ts
import { z } from 'zod'

export const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive().max(999_999_999_999),
  categoryId: z.string().cuid(),
  description: z.string().max(500).optional(),
  transactionDate: z.string().date(),
})

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>
```

- [ ] Schema untuk request body (POST/PATCH)
- [ ] Schema untuk query params (GET dengan filter)
- [ ] Export TypeScript types dari schema

---

### Step 3 — Buat/Update Service

Lokasi: `lib/services/`

```typescript
// lib/services/[feature].service.ts

export const featureService = {
  async findMany(options: { userId: string; /* filters */ }) {
    // userId SELALU pertama, SELALU dari session
    const { userId, ...filters } = options
    return prisma.[model].findMany({
      where: { userId, ...buildFilter(filters) },
    })
  },

  async findById(userId: string, id: string) {
    return prisma.[model].findFirst({
      where: { id, userId }, // ownership check
    })
  },

  async create(data: { userId: string } & CreateDto) {
    return prisma.[model].create({ data })
  },

  async update(userId: string, id: string, data: UpdateDto) {
    const exists = await this.findById(userId, id)
    if (!exists) return null
    return prisma.[model].update({ where: { id }, data })
  },

  async delete(userId: string, id: string) {
    const exists = await this.findById(userId, id)
    if (!exists) return null
    return prisma.[model].delete({ where: { id } })
  },
}
```

- [ ] Service tidak mengambil userId dari luar — selalu parameter eksplisit
- [ ] `findById` dan semua mutasi selalu cek ownership
- [ ] Tidak ada logika HTTP (request/response) di service

---

### Step 4 — Buat Route Handler

Template wajib untuk setiap route handler:

```typescript
// app/api/[resource]/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { featureService } from '@/lib/services/feature.service'
import { createFeatureSchema } from '@/lib/validations/feature.schema'
import {
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/response'

// GET — List
export async function GET(request: NextRequest) {
  // 1. Auth
  const session = await getSession(request)
  if (!session) return apiUnauthorized()

  // 2. Parse & validate params
  const searchParams = request.nextUrl.searchParams
  // ...parse params

  // 3. Call service (userId dari session)
  try {
    const result = await featureService.findMany({
      userId: session.userId,
      // ...params
    })
    return apiSuccess(result)
  } catch (error) {
    console.error('[api:feature] GET failed:', error)
    return apiError()
  }
}

// POST — Create
export async function POST(request: NextRequest) {
  // 1. Auth
  const session = await getSession(request)
  if (!session) return apiUnauthorized()

  // 2. Validate body
  const body = await request.json().catch(() => null)
  if (!body) return apiError('Invalid JSON body')

  const validated = createFeatureSchema.safeParse(body)
  if (!validated.success) return apiValidationError(validated.error)

  // 3. Call service
  try {
    const result = await featureService.create({
      userId: session.userId,
      ...validated.data,
    })
    return apiSuccess(result, 201)
  } catch (error) {
    console.error('[api:feature] POST failed:', error)
    return apiError()
  }
}
```

- [ ] Auth check di awal setiap handler
- [ ] Validasi body dengan Zod `safeParse`
- [ ] `userId` hanya dari `session.userId`
- [ ] Semua call ke service dibungkus try/catch
- [ ] Return `apiSuccess`, `apiUnauthorized`, `apiValidationError`, `apiNotFound`, atau `apiError`

---

### Step 5 — Update lib/utils/response.ts (Jika Perlu)

Pastikan semua helper sudah ada di `lib/utils/response.ts`:

```typescript
apiSuccess(data, status?)
apiUnauthorized()
apiNotFound(message?)
apiValidationError(zodError)
apiConflict(message)
apiError(message?)
```

---

### Step 6 — Test Endpoint

```bash
# Test dengan curl atau browser dev tools
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"EXPENSE","amount":50000,"categoryId":"...","transactionDate":"2026-08-18"}'
```

- [ ] Endpoint dapat diakses
- [ ] Auth: request tanpa cookie → 401
- [ ] Validation: body tidak valid → 400 dengan detail error
- [ ] Success: data valid → 200/201 dengan response format yang benar
- [ ] Ownership: coba akses data user lain → 404

---

### Step 7 — Update API.md

Setelah endpoint selesai, update `saveme-project/API.md`:
- [ ] Tambahkan atau update dokumentasi endpoint
- [ ] Dokumentasikan request body / query params
- [ ] Dokumentasikan response format
- [ ] Dokumentasikan error cases

---

### Step 8 — Jalankan finish-feature.md

Lanjutkan ke `finish-feature.md` untuk menyelesaikan workflow.

---

## Quick Reference: Response Codes

| Situasi | Status | Helper |
|---|---|---|
| Success (data) | 200 | `apiSuccess(data)` |
| Success (created) | 201 | `apiSuccess(data, 201)` |
| No auth / invalid token | 401 | `apiUnauthorized()` |
| Valid token, no permission | 403 | — (gunakan 404 untuk hiding) |
| Resource not found / wrong user | 404 | `apiNotFound()` |
| Duplicate resource | 409 | `apiConflict(message)` |
| Invalid request body | 400 | `apiValidationError(error)` |
| Unexpected server error | 500 | `apiError()` |
