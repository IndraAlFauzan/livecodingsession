-- Skema seperti saat project pertama berjalan, sebelum ada migrasi.
-- Database lama yang sudah berisi data dianggap sudah berada di versi ini
-- (lihat penanda awal di migrate.js), jadi berkas ini tidak dijalankan ulang
-- di atas data nyata.

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL UNIQUE,
  code_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'finished')),
  visible INTEGER NOT NULL DEFAULT 1,
  continues_from TEXT REFERENCES meetings(id) ON DELETE SET NULL,
  project_name TEXT,
  tree TEXT NOT NULL DEFAULT '[]',
  active_file TEXT,
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (course_id, number)
);

CREATE TABLE IF NOT EXISTS blobs (
  hash TEXT PRIMARY KEY,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_files (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'asset')),
  language TEXT,
  hash TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (meeting_id, path)
);
