-- Memisahkan "undangan masuk" dari "tanda pengenal yang terus dipakai".
--
-- Sebelum ini, kode akses merangkap keduanya: frontend menyimpannya lalu
-- mengirimkannya di setiap polling dan sambung ulang. Akibatnya mengganti kode
-- melempar keluar semua mahasiswa yang sudah di dalam, bukan hanya menutup
-- pintu untuk pendatang baru.
--
-- Dengan tabel ini, mahasiswa yang berhasil masuk memegang tanda sesinya
-- sendiri yang tidak terpengaruh pergantian kode.

CREATE TABLE IF NOT EXISTS course_students (
  token TEXT PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_students_course ON course_students (course_id);
