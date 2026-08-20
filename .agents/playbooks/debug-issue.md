# Playbook: Debug Issue

Gunakan playbook ini ketika ada bug, error, atau behavior yang tidak sesuai harapan.

---

## Kapan Digunakan
- Ada error di console/terminal
- Feature tidak bekerja sesuai expected behavior
- API mengembalikan response yang salah
- Data tidak tersimpan atau tampil dengan benar

---

## Steps

### Step 1 — Reproduce the Issue

Sebelum apapun, pastikan bisa reproduce bug-nya secara konsisten:

- [ ] Apa langkah exact untuk trigger bug ini?
- [ ] Apakah terjadi selalu atau hanya kadang-kadang?
- [ ] Apakah terjadi di semua user atau hanya user tertentu?
- [ ] Apakah baru terjadi setelah perubahan tertentu?

```
Reproduction steps:
1. Login sebagai user X
2. Pergi ke halaman /transactions
3. Klik "Add Transaction"
4. Isi form dan submit
→ Expected: transaksi tersimpan dan muncul di list
→ Actual: form submit tapi transaksi tidak muncul
```

---

### Step 2 — Isolate the Layer

Tentukan di layer mana masalah terjadi:

```
Browser → Network request → Route Handler → Service → Prisma → Database
```

**Check dari luar ke dalam:**

#### Layer 1: Browser / UI
- [ ] Buka DevTools → Network tab
- [ ] Cek apakah request dikirim ke API
- [ ] Cek request payload (apakah data yang dikirim benar?)
- [ ] Cek response dari API (status code, body)

#### Layer 2: API / Route Handler
- [ ] Cek terminal `npm run dev` — ada error log?
- [ ] Tambah temporary `console.log` di awal handler untuk confirm handler dipanggil
- [ ] Cek apakah auth check pass (session ada?)
- [ ] Cek apakah Zod validation pass

```typescript
// Temporary debug (hapus setelah selesai)
export async function POST(request: NextRequest) {
  console.log('[DEBUG] POST /api/transactions called')
  const session = await getSession(request)
  console.log('[DEBUG] session:', session?.userId)
  
  const body = await request.json()
  console.log('[DEBUG] body:', body)
  
  const validated = schema.safeParse(body)
  console.log('[DEBUG] validation:', validated.success, validated.error?.flatten())
  // ...
}
```

#### Layer 3: Service
- [ ] Log input yang masuk ke service
- [ ] Log query yang dibangun sebelum dieksekusi
- [ ] Pastikan `userId` constraint ada di query

```typescript
// Temporary debug di service
async findMany(options: FindManyOptions) {
  console.log('[DEBUG] findMany options:', options)
  const where = { userId: options.userId, ...buildFilter(options) }
  console.log('[DEBUG] where clause:', where)
  const result = await prisma.transaction.findMany({ where })
  console.log('[DEBUG] result count:', result.length)
  return result
}
```

#### Layer 4: Database
- [ ] Buka Prisma Studio: `npx prisma studio`
- [ ] Cek apakah data ada di database
- [ ] Cek apakah userId di data sesuai dengan session user
- [ ] Cek apakah index ada dan digunakan

---

### Step 3 — Identify Root Cause

Setelah isolation, catat root cause:

```
Root cause: [Deskripsi singkat]
Layer: [Browser / API / Service / Database]
File: [path/to/file.ts line X]

Contoh:
Root cause: userId tidak disertakan dalam Prisma query
Layer: Service
File: lib/services/transaction.service.ts line 42
```

---

### Step 4 — Fix

Setelah root cause ditemukan:

- [ ] Buat fix yang minimal dan targeted (jangan ubah banyak hal sekaligus)
- [ ] Hapus semua `console.log` debug yang ditambahkan di Step 2
- [ ] Pastikan fix tidak menimbulkan bug baru

**Jika fix mempengaruhi security** (misal: ditemukan missing userId constraint):
→ Jalankan `security-review.md` setelah fix

---

### Step 5 — Verify Fix

- [ ] Reproduce ulang scenario dari Step 1 — bug sudah hilang?
- [ ] Test edge cases terkait:
  - [ ] Data valid → berhasil
  - [ ] Data tidak valid → error yang tepat
  - [ ] Unauthenticated → 401
  - [ ] Data milik user lain → 404
- [ ] Cek TypeScript: `npx tsc --noEmit`

---

### Step 6 — Root Cause Analysis (Jika Bug Signifikan)

Jika bug ini serius (misal: data leakage, security issue), catat di `saveme-project/DECISIONS.md`:

```markdown
## Bug Report: [Judul Bug]
**Date:** YYYY-MM-DD
**Severity:** High / Medium / Low

### Problem
Deskripsi bug.

### Root Cause
Kenapa terjadi.

### Fix
Apa yang diperbaiki.

### Prevention
Apa yang dilakukan agar tidak terulang?
(contoh: tambah ke security-review.md checklist)
```

---

### Step 7 — Update Playbook / Skill (Jika Relevan)

Jika bug ini disebabkan oleh pattern yang kurang jelas di skill atau playbook:

- [ ] Update skill yang relevan dengan contoh yang lebih jelas
- [ ] Tambahkan checklist item ke `security-review.md` jika ada security concern baru
- [ ] Tambahkan ke "Prohibited Patterns" di `DEVELOPMENT.md`

---

### Step 8 — Jalankan finish-feature.md

Lanjutkan ke `finish-feature.md` untuk complete workflow.

---

## Common Issues & Quick Fixes

| Symptom | Kemungkinan Penyebab | Cek Di |
|---|---|---|
| API returns 401 | Session tidak ada / expired | Cookie di DevTools |
| API returns 404 | userId constraint tidak match | Service layer query |
| Data tidak muncul | Query filter terlalu ketat / userId salah | Service + DB |
| TypeScript error | Type mismatch setelah schema change | `npx tsc --noEmit` |
| Prisma error | Client belum di-generate | `npx prisma generate` |
| Form tidak submit | Validasi client gagal / event handler | Browser console |
| Cookie tidak tersimpan | SameSite / Secure mismatch | Cookie settings |
| Data dari user lain | Missing userId filter | Service query |
