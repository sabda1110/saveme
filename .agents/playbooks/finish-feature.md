# Playbook: Finish Feature

Gunakan playbook ini setiap kali selesai mengimplementasikan sebuah feature/task.

---

## Kapan Digunakan
- Setelah implementasi selesai
- Sebelum memberitahu user bahwa task selesai
- Sebelum memulai feature berikutnya

---

## Steps

### Step 1 — Verify Implementation

- [ ] Semua file yang ada di plan sudah dibuat/dimodifikasi
- [ ] Tidak ada file yang terlupakan (route handler, service, schema, dll)
- [ ] Tidak ada `TODO` atau `FIXME` yang tertinggal di kode baru

---

### Step 2 — Run Basic Verification

```bash
# Pastikan tidak ada TypeScript error
npx tsc --noEmit

# Pastikan app masih jalan
npm run dev

# Jika ada perubahan Prisma
npx prisma generate
```

- [ ] Tidak ada TypeScript error
- [ ] App berjalan tanpa crash
- [ ] Prisma client ter-generate (jika schema berubah)

---

### Step 3 — Security Checklist

Untuk setiap endpoint atau fitur yang berhubungan dengan data user:

- [ ] `userId` selalu diambil dari session, bukan dari request
- [ ] Semua query ke `transactions` table menyertakan `userId` constraint
- [ ] Input divalidasi dengan Zod sebelum diproses
- [ ] Ownership diverifikasi sebelum read/update/delete
- [ ] Error response tidak mengekspos informasi sensitif
- [ ] Tidak ada secret/token di client-side code

Jika ada potensi security issue → jalankan `security-review.md`

---

### Step 4 — Update Documentation

Tandai apa yang berubah:

- [ ] **API berubah?** → Update `saveme-project/API.md`
- [ ] **Database schema berubah?** → Update `saveme-project/DATABASE.md`
- [ ] **Architecture berubah?** → Update `saveme-project/ARCHITECTURE.md`
- [ ] **Design system berubah?** → Update `saveme-project/DESIGN.md`
- [ ] **Keputusan baru dibuat?** → Catat di `saveme-project/DECISIONS.md`

---

### Step 5 — Update Roadmap

Buka `saveme-project/ROADMAP.md`:

- [ ] Tandai task yang sudah selesai dengan `✅`
- [ ] Update status phase jika semua task dalam phase sudah selesai
- [ ] Update `Last Updated` date

---

### Step 6 — Update Phase Plan

Buka file plan yang relevan di `saveme-project/plans/`:

- [ ] Tandai checklist item yang sudah selesai
- [ ] Update acceptance criteria jika ada yang berubah

---

### Step 7 — Update Agent Skills (If Needed)

Jika ditemukan pattern baru atau rule baru selama implementasi:

- [ ] Apakah ada pattern baru yang harus didokumentasikan di skill?
- [ ] Apakah ada rule yang perlu diperbarui?
- [ ] Update skill yang relevan jika perlu

---

### Step 8 — Git Status Review

```bash
# Lihat perubahan yang dibuat
git status
git diff --stat
```

- [ ] Semua perubahan sudah sesuai dengan yang diplan
- [ ] Tidak ada file yang tidak sengaja berubah
- [ ] **JANGAN commit** sampai user memberikan instruksi eksplisit

---

### Step 9 — Report to User

Berikan ringkasan ke user:

```
✅ Feature: [Nama Feature]

### Yang Dikerjakan
- File baru: ...
- File dimodifikasi: ...
- Database: ...

### Cara Test
1. ...
2. ...

### Catatan
- ...

### Next Step
- Lanjut ke: [task berikutnya dari roadmap]
```

---

## Definisi "Done"

Feature dianggap selesai jika:
- [ ] Implementasi berjalan
- [ ] Tidak ada TypeScript error
- [ ] Security checklist passed
- [ ] Dokumentasi diupdate
- [ ] Roadmap diupdate
- [ ] User sudah di-inform
