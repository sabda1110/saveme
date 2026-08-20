# Playbook: Security Review

Gunakan playbook ini sebelum ship feature apapun yang menyentuh data user atau endpoint API.

---

## Kapan Digunakan
- Sebelum menyelesaikan feature yang ada API endpoint baru
- Sebelum ship Phase 2 (Authentication)
- Sebelum ship Phase 5 (Polish & Security)
- Kapan saja ada keraguan tentang keamanan

---

## 1. Authentication Checklist

### Session & Cookie
- [ ] Session token disimpan di HTTP-only cookie (tidak bisa diakses JavaScript)
- [ ] Cookie memiliki `Secure: true` di production
- [ ] Cookie memiliki `SameSite: 'lax'` untuk CSRF protection
- [ ] Token memiliki expiry (`maxAge` atau `exp` di JWT payload)
- [ ] Logout benar-benar menghapus cookie (`cookies().delete(COOKIE_NAME)`)

### JWT
- [ ] `JWT_SECRET` diambil dari environment variable, bukan hardcoded
- [ ] `JWT_SECRET` panjang dan random (min 256-bit / 32 karakter random)
- [ ] Token diverifikasi signature-nya sebelum dipercaya
- [ ] Expired token ditolak dan mengembalikan 401

### Password
- [ ] Password di-hash dengan bcrypt (minimum 12 rounds)
- [ ] Password hash TIDAK pernah dikembalikan ke client (tidak ada di API response)
- [ ] Password TIDAK pernah di-log
- [ ] Login error message bersifat generik ("Invalid credentials" — bukan "Email not found")

---

## 2. Authorization Checklist (Data Isolation)

Ini adalah checklist paling kritis untuk SaveMe.

### userId Rule
- [ ] `userId` SELALU diambil dari `session.userId` (hasil verify JWT)
- [ ] `userId` TIDAK PERNAH diambil dari:
  - `request.body.userId`
  - `request.nextUrl.searchParams.get('userId')`
  - `params.userId` (URL param)
  - Apapun yang datang dari client

```typescript
// ✅ WAJIB
const session = await getSession(request)
if (!session) return apiUnauthorized()
const { userId } = session

// ❌ DILARANG
const userId = body.userId
const userId = searchParams.get('userId')
```

### Query Isolation
Untuk setiap query pada tabel `transactions`, cek:

- [ ] `WHERE userId = session.userId` ada di setiap `findMany`
- [ ] `WHERE id = :id AND userId = session.userId` ada di `findById`
- [ ] `WHERE id = :id AND userId = session.userId` ada di `update`
- [ ] `WHERE id = :id AND userId = session.userId` ada di `delete`

```typescript
// ✅ BENAR — ownership check di findById
const tx = await prisma.transaction.findFirst({
  where: { id, userId }  // kedua kondisi wajib ada
})
if (!tx) return apiNotFound()  // 404, bukan 403 (hindari reveal existence)
```

### Ownership Before Mutation
- [ ] Setiap `PATCH /api/transactions/:id` — verify ownership sebelum update
- [ ] Setiap `DELETE /api/transactions/:id` — verify ownership sebelum delete
- [ ] Return 404 (bukan 403) jika data tidak ditemukan atau bukan milik user

---

## 3. Input Validation Checklist

### Request Body
- [ ] Semua endpoint POST/PATCH menggunakan Zod `safeParse` pada request body
- [ ] Jika validasi gagal → return 400 dengan detail error
- [ ] Tidak ada raw user input yang langsung masuk ke database query

### Tipe Data Finansial
- [ ] `amount` divalidasi sebagai angka positif
- [ ] `amount` punya batas maksimum yang wajar (contoh: max 999,999,999,999)
- [ ] `categoryId` divalidasi sebagai cuid

### String Fields
- [ ] Field text seperti `description` punya max length (contoh: 500 chars)
- [ ] Tidak ada field yang menerima HTML atau script tags tanpa sanitasi

---

## 4. Information Disclosure Checklist

### Error Responses
- [ ] Error 500 mengembalikan pesan generik, bukan stack trace
- [ ] Error tidak mengekspos nama tabel, nama field internal, atau query
- [ ] Error tidak mengekspos apakah email sudah terdaftar (gunakan pesan generik)

### Logging
- [ ] Tidak ada `console.log` yang mencetak: password, token, passwordHash
- [ ] Tidak ada `console.log` yang mencetak data finansial user
- [ ] Error di-log sebagai `console.error` dengan pesan safe (bukan seluruh object user)

```typescript
// ✅ Safe logging
console.error('[service:auth] Login failed for email:', email.substring(0,3) + '***')

// ❌ Unsafe
console.log('User data:', user) // bisa include passwordHash!
console.log('Token:', token)
```

### Environment Variables
- [ ] Tidak ada secret yang di-hardcode (JWT_SECRET, DATABASE_URL)
- [ ] `NEXT_PUBLIC_` prefix hanya untuk variable yang aman tampil di client
- [ ] `.env` ada di `.gitignore`
- [ ] `.env.example` ada dengan placeholder, bukan nilai asli

---

## 5. Dependency Checklist

- [ ] Tidak ada library yang di-install dari sumber tidak terpercaya
- [ ] Library yang digunakan untuk kriptografi adalah library established (jose, bcrypt)
- [ ] Tidak ada implementasi kriptografi manual (jangan buat JWT sendiri dari scratch)

---

## 6. SQL Injection

Prisma menggunakan parameterized queries secara otomatis — risiko SQL injection sangat rendah.

- [ ] Tidak ada `prisma.$executeRawUnsafe` dengan string interpolation
- [ ] Jika menggunakan raw query, gunakan tagged template: `prisma.$executeRaw`

```typescript
// ✅ Safe (Prisma handles parameterization)
await prisma.$executeRaw`DELETE FROM users WHERE id = ${userId}`

// ❌ Unsafe
await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = '${userId}'`)
```

---

## 7. Rate Limiting (Phase 5)

Untuk Phase 5, pastikan:

- [ ] Login endpoint di-rate-limit (max 5 request / 15 menit per IP)
- [ ] Register endpoint di-rate-limit (max 3 request / 15 menit per IP)
- [ ] Gunakan library seperti `@upstash/ratelimit` atau middleware custom

---

## 8. Final Sign-off

Setelah semua checklist hijau:

- [ ] Review perubahan dengan `git diff`
- [ ] Tidak ada kode yang melewati checklist di atas
- [ ] Lanjutkan ke `finish-feature.md`

---

## Quick Reference: Forbidden Patterns

```typescript
// 1. userId dari client
const userId = req.body.userId              // ❌
const userId = searchParams.get('userId')   // ❌
const { userId } = params                   // ❌

// 2. Query tanpa userId filter
prisma.transaction.findMany()               // ❌ (semua user!)
prisma.transaction.findMany({ where: { type: 'EXPENSE' } })  // ❌

// 3. Password/hash dalam response
return { id, email, passwordHash }          // ❌

// 4. Secret hardcoded
const secret = "my-secret-key"             // ❌
```
