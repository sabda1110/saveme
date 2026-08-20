# Playbook: Firestore Schema & Indexing

Gunakan playbook ini setiap kali melakukan penambahan/perubahan struktur koleksi Cloud Firestore, penyesuaian Security Rules, atau penambahan Composite Indexes.

---

## Kapan Digunakan
- Menambah atau memodifikasi schema field pada Firestore Document
- Menambah atau memperbarui Firestore Security Rules (`firestore.rules`)
- Menambah Composite Indexes baru di Firebase Console
- Menambah kategori default atau seed data baru

---

## Steps

### Step 1 — Review Struktur Koleksi Saat Ini
- [ ] Buka `saveme-project/DATABASE.md` dan `.agents/skills/database/SKILL.md`
- [ ] Pahami koleksi yang terdampak (`users`, `categories`, `transactions`)

### Step 2 — Perbarui TypeScript Types & Validation
- [ ] Update `types/index.ts` untuk field baru
- [ ] Update schema Zod di `lib/validations/`

### Step 3 — Perbarui Service Layer
- [ ] Update fungsi terkait di `lib/services/transaction.firebase.ts` atau `lib/services/category.firebase.ts`
- [ ] Pastikan validasi `userId == user.uid` tetap terjaga

### Step 4 — Verifikasi Firestore Security Rules & Indexes
- [ ] Pastikan Firestore rules mencakup permissions field baru
- [ ] Jika melakukan query dengan multiple `where` + `orderBy`, buat composite index di Firebase Console

### Step 5 — Update Dokumentasi
- [ ] Perbarui `saveme-project/DATABASE.md`
- [ ] Jika merupakan keputusan arsitektural besar, catat di `saveme-project/DECISIONS.md`
