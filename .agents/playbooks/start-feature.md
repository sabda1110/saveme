# Playbook: Start Feature

Gunakan playbook ini setiap kali memulai task/feature baru yang melibatkan perubahan kode.

---

## Kapan Digunakan
- Menerima request baru dari user
- Memulai phase development baru
- Menambah fitur atau endpoint baru

---

## Steps

### Step 1 — Understand the Request
- [ ] Baca dan pahami request user secara penuh
- [ ] Identifikasi domain yang terlibat: **frontend / backend / database / design**
- [ ] Catat apakah ada ambiguitas yang perlu diklarifikasi

---

### Step 2 — Read Documentation
- [ ] Baca `saveme-project/REQUIREMENTS.md` — pastikan feature ini ada di scope
- [ ] Baca `saveme-project/ARCHITECTURE.md` — pahami folder structure dan flow
- [ ] Baca `saveme-project/API.md` jika menyangkut endpoint
- [ ] Baca `saveme-project/DATABASE.md` jika menyangkut database

---

### Step 3 — Read Relevant Skills
Gunakan `view_file` untuk membaca SKILL.md yang relevan:

```
Frontend task?  → view_file .agents/skills/frontend/SKILL.md
Backend task?   → view_file .agents/skills/backend/SKILL.md
Database task?  → view_file .agents/skills/database/SKILL.md
UI/Design task? → view_file .agents/skills/design/SKILL.md
```

**Jangan skip step ini.** Skill berisi pattern, contoh kode, dan aturan spesifik SaveMe.

---

### Step 4 — Inspect Existing Code
- [ ] Gunakan `grep_search` untuk mencari file terkait
- [ ] Gunakan `view_file` untuk membaca file yang akan dimodifikasi
- [ ] Identifikasi pattern yang sudah digunakan (jangan buat ulang)

```
# Contoh: mencari pattern service yang ada
grep_search "transactionService" --include="*.ts"

# Contoh: lihat struktur yang ada
list_dir app/api/
```

---

### Step 5 — Create Implementation Plan

Buat plan dengan format ini:

```markdown
## Plan: [Nama Feature]

### What will change
- [NEW] path/to/new/file.ts — deskripsi singkat
- [MODIFY] path/to/existing/file.ts — apa yang berubah
- [DELETE] path/to/file.ts — kenapa dihapus

### Packages to install (if any)
- package-name: alasan

### Database changes (if any)
- Migration: deskripsi perubahan schema

### Open questions
- Pertanyaan yang butuh input user

### Risk / Notes
- Potensi breaking change
- Security consideration
- Performance consideration
```

---

### Step 6 — STOP. Present Plan to User

**Jangan menulis kode apapun sebelum user approve.**

Presentasikan plan dan tunggu konfirmasi.

Lanjutkan hanya jika user:
- Bilang "ok lanjut"
- Bilang "proceed"
- Bilang "langsung saja"
- Memberikan approval eksplisit

---

### Step 7 — Implement (After Approval)

Setelah approved, gunakan playbook yang sesuai:
- Menambah API endpoint? → Buka `add-api-endpoint.md`
- Menambah halaman? → Buka `add-page.md`
- Mengubah database? → Buka `database-migration.md`

---

### Step 8 — Finish

Setelah implementasi selesai, jalankan `finish-feature.md`.

---

## Checklist Sebelum Mulai Coding

- [ ] Sudah baca REQUIREMENTS.md
- [ ] Sudah baca ARCHITECTURE.md (jika perlu)
- [ ] Sudah baca skill yang relevan
- [ ] Sudah inspect kode yang ada
- [ ] Sudah buat plan
- [ ] Sudah dapat approval user
