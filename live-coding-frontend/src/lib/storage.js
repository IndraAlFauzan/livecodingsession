function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Penyimpanan browser tidak tersedia (mode privat); data hanya bertahan selama halaman terbuka.
  }
}

export const storage = {
  // Satu tanda sesi untuk seluruh akun. Daftar mata kuliah tidak lagi disimpan
  // di sini -- riwayat itu milik akun dan diambil dari server, jadi tetap sama
  // di perangkat mana pun mahasiswa masuk.
  getStudentToken: () => read("lc.studentToken", null),
  setStudentToken: (token) => write("lc.studentToken", token),

  // Mahasiswa yang suka layar penuh tidak perlu menekan tombolnya tiap pertemuan.
  getFocusMode: () => read("lc.fokus", false) === true,
  setFocusMode: (on) => write("lc.fokus", Boolean(on)),

  // Sebagian mahasiswa ingin melihat sumber README-nya; pilihan itu menempel.
  getMarkdownSource: () => read("lc.mdSumber", false) === true,
  setMarkdownSource: (on) => write("lc.mdSumber", Boolean(on)),

  getAdminToken: () => read("lc.adminToken", null),
  setAdminToken: (token) => write("lc.adminToken", token),

  // Sisa penyimpanan dari versi sebelum ada akun. Dibersihkan sekali saat
  // aplikasi dibuka supaya tidak menumpuk di perangkat mahasiswa lama.
  dropLegacy() {
    write("lc.courses", null);
    write("lc.studentName", null);
  },
};
