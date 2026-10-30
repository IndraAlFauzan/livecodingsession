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

  getAdminToken: () => read("lc.adminToken", null),
  setAdminToken: (token) => write("lc.adminToken", token),

  // Sisa penyimpanan dari versi sebelum ada akun. Dibersihkan sekali saat
  // aplikasi dibuka supaya tidak menumpuk di perangkat mahasiswa lama.
  dropLegacy() {
    write("lc.courses", null);
    write("lc.studentName", null);
  },
};
