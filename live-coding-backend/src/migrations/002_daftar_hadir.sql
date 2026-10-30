-- Mencatat mahasiswa yang pernah membuka sebuah pertemuan.
-- Nama diketik sendiri tanpa akun, jadi ini laporan kehadiran, bukan identitas.

CREATE TABLE IF NOT EXISTS meeting_viewers (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (meeting_id, name)
);
