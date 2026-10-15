# Live Coding Classroom Backend

Backend Node.js (Express + WebSocket + SQLite) yang menerima kode dari VS Code Extension dosen, menyimpannya per pertemuan, dan menyiarkannya ke web mahasiswa.

## Konsep

- **Mata kuliah** punya kode akses sendiri (misalnya `PM-7K3XQ2`). Mahasiswa hanya bisa membuka mata kuliah yang kodenya mereka punya.
- **Pertemuan** menyimpan snapshot kode terakhir. Status: `draft` (belum dimulai), `live`, `finished`. Bisa ditampilkan atau disembunyikan.
- **Lanjutan**: pertemuan bisa menandai `continuesFrom` pertemuan lain. File diberi label `new`/`modified` dibanding pertemuan tersebut.

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
| `DB_PATH` | Lokasi file database, default `data/livecoding.db` |

Backup data cukup dengan menyalin file database.

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

Mahasiswa:

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/student/access` | `{ code }` → mata kuliah |
| GET | `/api/student/courses/:slug` | Header `X-Access-Code`; pertemuan yang tampil dan sudah dimulai |

## WebSocket

| Event | Dari | Isi |
|---|---|---|
| `teacher:join` | dosen | `meetingId, teacherToken, projectName, continuesFrom` |
| `teacher:joined` | server | `studentUrl, accessCode, courseName` |
| `student:join` | mahasiswa | `meetingId, accessCode` |
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
TEACHER_TOKEN=<token> node examples/smoke-test.js
```

Skrip membuat data uji lalu menghapusnya kembali.
