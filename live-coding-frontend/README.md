# Live Coding Classroom Frontend

Web untuk mahasiswa (melihat kode dosen) dan halaman admin dosen. React + Vite + Monaco Editor.

## Halaman

| URL | Untuk | Isi |
|---|---|---|
| `/` | mahasiswa | Masuk/daftar akun, lalu gabung mata kuliah dengan kode akses |
| `/mk/:slug` | mahasiswa | Daftar pertemuan (Live/Selesai, label lanjutan) |
| `/mk/:slug/p/:id` | mahasiswa | Viewer kode: real-time saat live, arsip read-only setelah selesai |
| `/pratinjau/mk/:slug/p/:id` | dosen | Pratinjau halaman mahasiswa memakai teacher token, tanpa akun mahasiswa |
| `/admin` | dosen | Kelola mata kuliah, kode akses, dan pertemuan (login dengan teacher token) |

## Akun mahasiswa

Mahasiswa masuk dengan NIM dan kata sandi. Tanda sesinya disimpan di `localStorage`
(`lc.studentToken`), tapi daftar mata kuliah tidak — riwayat itu milik akun dan selalu
diambil dari server, jadi tetap sama saat berpindah perangkat.

`StudentAuthProvider` (`hooks/useStudentAuth.jsx`) adalah satu-satunya sumber identitas;
`StudentGate` menahan semua halaman mahasiswa selama belum masuk. Kode akses mata kuliah
hanya dipakai sekali untuk bergabung — sesudah itu yang berlaku keanggotaan, sehingga dosen
bisa mengganti kode tanpa melempar keluar yang sudah di dalam.

Nama yang tampil di sesi live datang dari akun di sisi server, bukan dari kiriman klien.

Mahasiswa mengganti kata sandinya sendiri dari beranda; perangkat lain yang masih masuk ikut
dikeluarkan. Kalau sandinya lupa, dosen bisa membuat sandi sementara dari halaman admin.

## Catatan komponen

`Tabs` memeluk isinya dan dipakai untuk menyaring daftar (sering dengan jumlah di
sebelah labelnya). Untuk memilih mode yang setara — misalnya Masuk/Daftar — pakai
`Segmented`, yang membagi lebar rata. Memaksa `Tabs` selebar induknya membuat
labelnya menumpuk di kiri, karena `.lc-tabs` itu `inline-flex`.

`PasswordField` adalah `TextField` dengan tombol intip di dalam kotaknya. Pakai itu
untuk semua isian kata sandi, bukan `TextField type="password"` langsung.

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
| `hooks/useLiveSession.test.js` | percakapan WebSocket: join membawa tanda sesi (bukan nama), Follow Dosen, bedanya menunggu dan selesai, penolakan server |
| `hooks/useStudentAuth.test.jsx` | pemulihan sesi tersimpan, 401 vs gagal jaringan, keluar, gabung/keluar kelas |
| `components/student/AuthCard.test.jsx` | tab masuk/daftar, validasi sandi, kolom nama hanya saat mendaftar |
| `utils/meetingStatus.test.js` | status pertemuan, termasuk masa tenggang yang dulu salah dihitung |
| `components/ui/Dialog.test.jsx` | fokus awal di Batal, Esc, jebakan Tab, aria |
| `components/student/JoinCard.test.jsx` | validasi kode, huruf besar otomatis, kode mata kuliah lain ditolak |
| `components/admin/StudentRoster.test.jsx` | konfirmasi sebelum reset, baris yang benar yang direset, sandi sementara hanya tampil sekali |
| `components/student/PasswordDialog.test.jsx` | ulangan sandi dicocokkan di layar, pesan galat server, jumlah perangkat yang dikeluarkan |
| `components/ui/Segmented.test.jsx` | pilihan aktif, indeks yang dilaporkan, `type=button` agar tidak mengirim form |
| `components/ui/PasswordField.test.jsx` | tersembunyi secara bawaan, tombol intip bolak-balik, nama tombol menyebut kolomnya |

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
