# Live Coding Classroom Frontend

Web untuk mahasiswa (melihat kode dosen) dan halaman admin dosen. React + Vite + Monaco Editor.

## Halaman

| URL | Untuk | Isi |
|---|---|---|
| `/` | mahasiswa | Masukkan nama dan kode akses mata kuliah |
| `/mk/:slug` | mahasiswa | Daftar pertemuan (Live/Selesai, label lanjutan) |
| `/mk/:slug/p/:id` | mahasiswa | Viewer kode: real-time saat live, arsip read-only setelah selesai |
| `/admin` | dosen | Kelola mata kuliah, kode akses, dan pertemuan (login dengan teacher token) |

## Perlindungan kode

Viewer menyembunyikan kode saat shortcut screenshot terdeteksi, dan memblokir copy, cut, klik kanan, seret, seleksi teks, serta print. Browser tidak bisa mencegah screenshot dari sistem operasi atau kamera, dan sejak watermark dicabut bocoran tidak bisa dilacak ke mahasiswa asalnya.

## Pengujian

```bash
npm test          # sekali jalan
npm run test:watch
```

Vitest dengan jsdom. Yang diutamakan adalah perilaku yang mahal kalau rusak:

| Berkas | Yang dijaga |
|---|---|
| `hooks/useLiveSession.test.js` | percakapan WebSocket: join membawa nama, Follow Dosen, bedanya menunggu dan selesai, penolakan server |
| `utils/meetingStatus.test.js` | status pertemuan, termasuk masa tenggang yang dulu salah dihitung |
| `components/ui/Dialog.test.jsx` | fokus awal di Batal, Esc, jebakan Tab, aria |
| `components/student/JoinCard.test.jsx` | validasi, kode jadi huruf besar, kode mata kuliah lain ditolak |

`src/test/fakeWebSocket.js` adalah WebSocket tiruan yang dikemudikan tes — tidak ada koneksi sungguhan.

## Menjalankan

```bash
npm install
cp .env.example .env
npm run dev
```

Buka `http://localhost:5174`. Backend harus berjalan di alamat yang diatur `VITE_WS_URL` (default `ws://localhost:3000`). Alamat REST API diturunkan dari situ, atau atur `VITE_API_URL` bila berbeda.

## Build production

```bash
npm run build
```

Folder `dist/` disajikan sebagai static file. Server harus mengarahkan semua path ke `index.html` (misalnya `try_files $uri /index.html;` di nginx). Variabel `VITE_*` dibaca saat build, jadi set dulu sebelum menjalankan build.
