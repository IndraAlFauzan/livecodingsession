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
| `liveCoding.teacherToken` | **Usang.** Dipindahkan ke penyimpanan rahasia VS Code; jalankan `Live Coding: Masuk` lalu hapus setelan ini |
| `liveCoding.exclude` | Pola **tambahan** yang tidak dibagikan (format .gitignore) |
| `liveCoding.respectGitignore` | Ikut menyembunyikan isi `.gitignore` proyek (bawaan: hidup) |
| `liveCoding.maxFileSizeKb` | Ukuran maksimal file teks, default 512 KB |

Tiga lapis penyaring, dari paling umum ke paling spesifik:

1. **Daftar bawaan** — dependensi dan hasil build (`node_modules`, `build`, `dist`, `.dart_tool`, `.gradle`, `ios/Pods`), folder perkakas (`.git`, `.idea`, `.vscode`, `.claude`, `.cursor`, `__pycache__`, `target`), dan rahasia: `.env*`, keystore, `*.pem`, `*.key`, `id_rsa*`, `.npmrc`, `google-services.json`, `GoogleService-Info.plist`, `serviceAccount*.json`.
2. **`.gitignore` proyek** — apa yang tidak masuk git biasanya memang tidak layak disiarkan. Daftar bawaan pasti ketinggalan zaman; `.gitignore` dipelihara dosen sendiri jadi selalu mutakhir. Matikan lewat `liveCoding.respectGitignore` kalau perlu.
3. **`.livecodingignore`** — klik kanan file atau folder → *Sembunyikan dari mahasiswa*. Baris berawalan `!` di sini bisa membatalkan aturan dari dua lapis di atasnya.

`.github` sengaja **tidak** disembunyikan: workflow CI bukan rahasia dan sering jadi bahan ajar.

Folder yang jadi kosong setelah penyaringan ikut dibuang — folder kosong seperti `lib/generated/` justru memberi tahu mahasiswa ada sesuatu yang disembunyikan di situ. Gambar dan media hanya tampil namanya.

## Masuk sebagai dosen

Jalankan **Live Coding: Masuk** dari Command Palette. Kalau `liveCoding.backendUrl` masih
bawaan (`ws://localhost:3000`), alamat server ditanyakan lebih dulu — alamat berawalan
`https://` diterima dan diubah sendiri jadi `wss://`, karena orang biasanya menyalin alamat
halaman admin. Tersimpan sebagai setelan User; alamat server bukan rahasia.

Lalu dua pilihan: sebagai **dosen** dengan username + kata sandi dari admin kampus, atau sebagai
**admin kampus** dengan `TEACHER_TOKEN`.

Kredensialnya disimpan di **SecretStorage** VS Code, bukan `settings.json`. Setelan lama masih
dibaca sebagai cadangan supaya yang sudah memakainya tidak mendadak terkunci — tapi
`settings.json` ikut Settings Sync ke akun, dan untuk setelan Workspace ia hidup di
`.vscode/settings.json` yang gampang ter-commit. Begitu sudah masuk lewat perintah, hapus
setelan lamanya.

Akun yang sedang dipakai terlihat di tooltip status bar dan baris teratas panel Live Coding —
berguna saat satu komputer dipakai bergantian beberapa dosen. **Live Coding: Keluar** mencabut
tanda sesinya di server.

## Development

```bash
npm install
npm run compile
npx vsce package --allow-missing-repository --skip-license
code --install-extension live-coding-classroom-0.1.0.vsix
```

Atau buka folder ini di VS Code dan tekan `F5`.
