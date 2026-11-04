-- Banyak dosen memakai satu token bersama adalah masalah: satu kebocoran
-- memaksa semua orang ganti, semua bisa menghapus mata kuliah siapa pun, dan
-- tidak ada jejak siapa melakukan apa.
--
-- TEACHER_TOKEN di env tetap berlaku sebagai kunci admin kampus. Mata kuliah
-- yang sudah ada mendapat teacher_id NULL, artinya milik admin -- jadi kelas
-- yang sedang berjalan tidak terganggu sama sekali, dan pemiliknya bisa
-- ditetapkan belakangan tanpa terburu-buru.

-- code: kode dosen yang dipakai kampus (misalnya OCH). Mahasiswa melihatnya di
-- samping nama mata kuliah, karena kelas paralel sering bernama persis sama dan
-- hanya kode dosennya yang membedakan.
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS teacher_sessions (
  token TEXT PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher ON teacher_sessions (teacher_id);

-- NULL = milik admin kampus. ON DELETE SET NULL supaya menghapus akun dosen
-- tidak ikut menghapus mata kuliahnya beserta seluruh arsip kodenya.
ALTER TABLE courses ADD COLUMN teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses (teacher_id);
