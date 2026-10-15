# Live Coding Classroom VS Code Extension

Extension untuk dosen. Membagikan file tree, isi file, dan file yang sedang dibuka ke mahasiswa secara real-time, dan menyimpannya sebagai pertemuan di backend.

## Cara pakai

1. `Live Coding: Start Session` dari Command Palette.
2. Pilih mata kuliah (atau buat baru).
3. Pilih pertemuan (atau buat pertemuan baru).
4. Kalau sudah ada pertemuan sebelumnya, pilih apakah ini **lanjutan** dari pertemuan tertentu atau **project baru**. Pertemuan dengan nama project yang sama diletakkan paling atas.
5. Bagikan kode akses atau link ke mahasiswa. Keduanya bisa disalin dari notifikasi atau dengan mengklik indikator **Live** di status bar.
6. `Live Coding: Stop Session` saat selesai. Kode tetap tersimpan dan bisa dibuka mahasiswa kapan saja.

Memilih pertemuan yang sudah selesai akan mengganti isinya dengan kondisi project sekarang (ada konfirmasi).

## Menyembunyikan file

Klik kanan file atau folder di Explorer (atau di tab editor), lalu pilih **Sembunyikan dari mahasiswa**. Untuk membukanya lagi, pilih **Tampilkan ke mahasiswa**.

- Daftarnya tersimpan di `.livecodingignore` di root project (format .gitignore) dan berlaku di semua pertemuan berikutnya. File ini bisa juga diedit manual.
- File tersembunyi diberi tanda `⊘` di Explorer.
- Saat live, perubahan langsung berlaku: file hilang dari tree mahasiswa dan dihapus dari server, lalu dikirim lagi saat ditampilkan.
- `.livecodingignore` sendiri tidak pernah dikirim ke mahasiswa.

## Settings

| Setting | Keterangan |
|---|---|
| `liveCoding.backendUrl` | URL WebSocket backend, contoh `ws://localhost:3000` atau `wss://api.domainkamu.com` |
| `liveCoding.teacherToken` | Harus sama dengan `TEACHER_TOKEN` di backend |
| `liveCoding.exclude` | Pola **tambahan** yang tidak dibagikan (format .gitignore) |
| `liveCoding.maxFileSizeKb` | Ukuran maksimal file teks, default 512 KB |

Selalu dikecualikan: `.git`, `node_modules`, `vendor`, `dist`, `build`, `out`, `coverage`, `.dart_tool`, `.gradle`, `ios/Pods`, `.flutter-plugins*`, `storage/logs`, `storage/framework`, `bootstrap/cache`, `public/build`, `.idea`, `.vscode`, `.env` dan `.env.*` (kecuali `.env.example`), file keystore/`key.properties`/`*.pem`, log, database SQLite, dan arsip. Gambar dan media hanya tampil namanya.

## Development

```bash
npm install
npm run compile
npx vsce package --allow-missing-repository --skip-license
code --install-extension live-coding-classroom-0.1.0.vsix
```

Atau buka folder ini di VS Code dan tekan `F5`.
