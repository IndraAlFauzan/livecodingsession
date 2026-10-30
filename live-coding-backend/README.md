# Live Coding Classroom Backend

Backend Node.js (Express + WebSocket + SQLite) yang menerima kode dari VS Code Extension dosen, menyimpannya per pertemuan, dan menyiarkannya ke web mahasiswa.

## Konsep

- **Akun mahasiswa** berisi NIM, nama, dan kata sandi (scrypt, versi async supaya satu kelas yang login bersamaan tidak memblokir event loop). Identitas di sesi live selalu diambil dari akun, tidak pernah dari kiriman klien.
- **Mata kuliah** punya kode akses sendiri (misalnya `PM-7K3XQ2`). Kode dipakai sekali untuk bergabung; sesudah itu yang berlaku adalah keanggotaan, jadi dosen bisa mengganti kode tanpa melempar keluar yang sudah masuk.
- **Pertemuan** menyimpan snapshot kode terakhir. Status: `draft` (belum dimulai), `live`, `finished`. Bisa ditampilkan atau disembunyikan.
- **Lanjutan**: pertemuan bisa menandai `continuesFrom` pertemuan lain. File diberi label `new`/`modified` dibanding pertemuan tersebut.

## Kata sandi

Dosen tidak bisa membaca kata sandi siapa pun. Yang tersedia hanya reset: server membuat
sandi sementara, mengembalikannya sekali untuk dibacakan, lalu mengeluarkan semua perangkat
mahasiswa itu.

Percobaan masuk dibatasi 10 kegagalan per 10 menit, **dihitung per NIM, bukan per alamat IP** —
satu kelas biasanya keluar lewat satu NAT kampus, jadi pembatasan per IP akan mengunci seisi
kelas sekaligus. Konsekuensinya orang yang tahu NIM teman bisa menghalanginya masuk selama
jendela itu; karena itu jendelanya pendek, hitungannya hangus begitu sandi yang benar masuk,
dan reset oleh dosen langsung membukanya. Hitungan disimpan di memori, hilang saat restart.

## Menjalankan

Butuh Node.js 22.13 atau lebih baru (memakai `node:sqlite` bawaan).

```bash
npm install
cp .env.example .env
npm run dev
```

| Variabel | Keterangan |
|---|---|
| `PORT` | Port HTTP/WebSocket, default `3000` |
| `TEACHER_TOKEN` | Token dosen untuk halaman admin dan extension. **Wajib diganti di server publik.** |
| `PUBLIC_BASE_URL` | URL frontend mahasiswa, dipakai untuk membuat link pertemuan |
| `MAX_FILE_SIZE_BYTES` | Ukuran maksimal satu file teks |
| `WS_HEARTBEAT_MS` | Jeda ping WebSocket, default `30000`. Koneksi yang tidak membalas dalam satu putaran diputus |
| `TEACHER_GRACE_MS` | Lama sesi ditahan tetap live saat koneksi dosen putus, default `120000`. Dosen pamit dari VS Code tetap mengakhiri sesi seketika |
| `DB_PATH` | Lokasi file database, default `data/livecoding.db` |

Endpoint `GET /api/admin/meetings/:id/viewers` mengembalikan `viewers` (semua yang pernah masuk, dari tabel `meeting_viewers`) dan `watchingNow` (yang sedang tersambung). Dosen juga menerima pesan WebSocket `room:viewers` setiap ada mahasiswa masuk, keluar, atau berpindah file.

### Mengubah skema database

Skema tidak ditulis langsung di `db.js`. Setiap perubahan bentuk tabel dibuat sebagai berkas baru bernomor di `src/migrations/`, lalu dijalankan otomatis saat server start. Versi yang sudah diterapkan dicatat di `PRAGMA user_version` di dalam berkas database itu sendiri.

```
src/migrations/
  001_skema_awal.sql     tabel awal
  002_daftar_hadir.sql   meeting_viewers
```

Menambah perubahan: buat `003_nama_perubahan.sql`, isi dengan `ALTER TABLE` atau `CREATE TABLE` yang diperlukan. Tiap migrasi dibungkus transaksi — kalau gagal, tidak ada yang berubah dan server menolak menyala dengan pesan yang menyebut berkas penyebabnya.

Database yang dibuat sebelum sistem ini ada ditandai otomatis sebagai versi 1, jadi migrasi lama tidak dijalankan ulang di atas data yang sudah ada.

Jangan mengubah berkas migrasi yang sudah pernah jalan di produksi — buat berkas baru.

### Cadangan

```bash
node scripts/backup.js [folder-tujuan]     # default: backups/
```

Menghasilkan satu berkas `.db` yang konsisten dan aman dijalankan selagi server hidup.

**Jangan memakai `cp livecoding.db`.** Database memakai mode WAL, jadi perubahan terbaru bisa masih berada di berkas `-wal` dan belum masuk ke `.db`. Diuji pada database yang sedang dipakai:

| Cara | tabel | courses | meeting_viewers |
|---|---|---|---|
| `cp livecoding.db` | 4 | 2 | tabel tidak ada |
| `node scripts/backup.js` | 5 | 3 | 3 |

Salinan `cp` kehilangan satu tabel penuh dan mata kuliah yang baru dibuat. Memulihkan cukup menaruh berkas hasil cadangan sebagai `data/livecoding.db`, atau mengarahkan `DB_PATH` ke sana.

## REST API

Admin (header `Authorization: Bearer <TEACHER_TOKEN>`):

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/admin/courses` | Daftar mata kuliah |
| POST | `/api/admin/courses` | `{ name }` |
| PATCH | `/api/admin/courses/:id` | `{ name?, codeActive? }` |
| POST | `/api/admin/courses/:id/regenerate-code` | Buat kode akses baru |
| DELETE | `/api/admin/courses/:id` | Hapus beserta semua pertemuan |
| GET | `/api/admin/courses/:id/meetings` | Semua pertemuan, termasuk draft/tersembunyi |
| POST | `/api/admin/courses/:id/meetings` | `{ title?, number? }` |
| PATCH | `/api/admin/meetings/:id` | `{ title?, visible?, number? }` |
| DELETE | `/api/admin/meetings/:id` | Ditolak bila sedang live |
| DELETE | `/api/admin/courses/:id/students` | Lepas semua keanggotaan kelas (akun tetap ada) |
| GET | `/api/admin/courses/:id/students` | Daftar anggota kelas |
| POST | `/api/admin/students/:nim/reset-password` | Sandi sementara baru, dikembalikan sekali |
| DELETE | `/api/admin/students/:nim` | Hapus akun beserta sesi dan riwayatnya |

Mahasiswa:

| Method | Path | Keterangan |
|---|---|---|
Semua rute di bawah `/me` dan `/courses` butuh header `X-Student-Token` dari hasil daftar/masuk.

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/student/register` | `{ nim, name, password }` → `{ student, token }` |
| POST | `/api/student/login` | `{ nim, password }` → `{ student, token }` |
| POST | `/api/student/logout` | Mematikan tanda sesi perangkat ini saja |
| GET | `/api/student/me` | Akun beserta riwayat mata kuliah |
| POST | `/api/student/courses` | `{ code }` → bergabung ke mata kuliah |
| GET | `/api/student/courses` | Riwayat mata kuliah |
| GET | `/api/student/courses/:slug` | Pertemuan yang tampil; 403 bila belum bergabung |
| DELETE | `/api/student/courses/:slug` | Keluar dari mata kuliah (akun tetap) |

## WebSocket

| Event | Dari | Isi |
|---|---|---|
| `teacher:join` | dosen | `meetingId, teacherToken, projectName, continuesFrom` |
| `teacher:joined` | server | `studentUrl, accessCode, courseName` |
| `student:join` | mahasiswa | `meetingId, studentToken` (nama diambil dari akun) |
| `session:init` | server | `course, meeting, tree, activeFile, changes, hasTeacher` |
| `project:snapshot`, `tree:update` | dosen | `tree` |
| `file:create`, `file:update` | dosen | `path, content, language` (diteruskan dengan `change`) |
| `asset:metadata`, `file:delete`, `teacher:active-file` | dosen | `path` |
| `teacher:leave` | dosen | menandai pertemuan selesai |
| `file:request` | mahasiswa | `path` → `file:content` / `asset:content` / `file:not-found` |
| `teacher:disconnected`, `meeting:closed`, `error` | server | `error.reason`: `invalid_code`, `unavailable`, `rejected` |

## Uji cepat

Dengan backend berjalan:

```bash
TEACHER_TOKEN=<token> npm test       # sama dengan: node examples/smoke-test.js
```

Skrip membuat data uji lalu menghapusnya kembali.
