-- Riwayat "terakhir dibuka" harus melekat pada akun, bukan pada nama.
--
-- meeting_viewers dari migrasi 002 berkunci (meeting_id, name). Dua mahasiswa
-- bernama sama akan dihitung sebagai satu baris -- masalah yang sama sudah kita
-- temui di daftar penonton dan diselesaikan dengan NIM.
--
-- Baris lama dari masa sebelum ada akun dipertahankan dengan student_id NULL:
-- namanya tidak bisa dipetakan balik ke akun mana pun, tapi daftar hadir lama
-- tidak perlu ikut hilang. Di indeks unik SQLite, NULL saling berbeda, jadi
-- baris-baris warisan itu tidak pernah bentrok satu sama lain.

CREATE TABLE meeting_viewers_baru (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1
);

INSERT INTO meeting_viewers_baru (meeting_id, student_id, name, first_seen, last_seen, visits)
SELECT meeting_id, NULL, name, first_seen, last_seen, visits FROM meeting_viewers;

DROP TABLE meeting_viewers;
ALTER TABLE meeting_viewers_baru RENAME TO meeting_viewers;

CREATE UNIQUE INDEX idx_viewers_meeting_student ON meeting_viewers (meeting_id, student_id);

-- Kueri beranda: "pertemuan apa saja yang terakhir dibuka akun ini".
CREATE INDEX idx_viewers_student_terakhir ON meeting_viewers (student_id, last_seen DESC);
