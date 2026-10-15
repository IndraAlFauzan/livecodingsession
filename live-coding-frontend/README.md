# Live Coding Classroom Frontend

Frontend mahasiswa untuk melihat project live coding dari dosen secara real-time.

## Fitur

- Join session dari URL `/session/:sessionId`
- Menampilkan struktur folder project
- Expand/collapse folder
- Klik file untuk melihat isi file
- Code viewer read-only menggunakan Monaco Editor
- Update isi file secara real-time via WebSocket
- Indikator file aktif dosen
- Mode `Follow Dosen`
- Status koneksi backend

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npm run dev
```

Buka browser:

```text
http://localhost:5173/session/flutter-01
```

Pastikan backend berjalan di:

```text
ws://localhost:3000
```

Jika backend berbeda, ubah `.env`:

```env
VITE_WS_URL=ws://localhost:3000
```

## Urutan Menjalankan Sistem

1. Jalankan backend Node.js.
2. Jalankan frontend ini.
3. Jalankan VS Code Extension di project dosen.
4. Start session dari VS Code, misalnya `flutter-01`.
5. Mahasiswa buka `http://localhost:5173/session/flutter-01`.

## Build Production

```bash
npm run build
npm run preview
```
