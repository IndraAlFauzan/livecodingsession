const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { nanoid } = require('nanoid');
const { config } = require('./config');
const { migrate } = require('./migrate');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

// Skema tidak lagi ditulis di sini. Berkas di src/migrations/ dijalankan
// berurutan dan versinya dicatat di PRAGMA user_version, supaya database
// produksi yang sudah berisi data bisa ikut berubah bentuk tanpa dibuat ulang.
try {
  const { applied } = migrate(db);
  if (applied.length > 0) console.log(`Skema database diperbarui: ${applied.length} migrasi.`);
} catch (error) {
  console.error('Migrasi database gagal, server tidak dijalankan.');
  console.error(error.message);
  process.exit(1);
}

// Saat startup belum ada dosen yang terhubung, jadi sesi live sebelum restart dianggap selesai.
db.prepare("UPDATE meetings SET status = 'finished', ended_at = ? WHERE status = 'live'").run(
  new Date().toISOString(),
);

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function now() {
  return new Date().toISOString();
}

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function isUniqueViolation(error) {
  return /UNIQUE constraint failed/.test(error?.message || '');
}

function slugify(name) {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'mk';
}

function uniqueSlug(name) {
  const base = slugify(name);
  const exists = db.prepare('SELECT 1 FROM courses WHERE slug = ?');
  let slug = base;
  for (let i = 2; exists.get(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function generateAccessCode(name) {
  const prefix = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3) || 'MK';

  const exists = db.prepare('SELECT 1 FROM courses WHERE access_code = ?');
  let code;
  do {
    let random = '';
    for (let i = 0; i < 6; i++) random += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    code = `${prefix}-${random}`;
  } while (exists.get(code));
  return code;
}

function normalizeCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

function toCourse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accessCode: row.access_code,
    codeActive: Boolean(row.code_active),
    createdAt: row.created_at,
    meetingCount: row.meeting_count ?? undefined,
  };
}

function toMeeting(row) {
  if (!row) return null;
  return {
    id: row.id,
    courseId: row.course_id,
    number: row.number,
    title: row.title,
    status: row.status,
    visible: Boolean(row.visible),
    continuesFrom: row.continues_from
      ? { id: row.continues_from, number: row.parent_number, title: row.parent_title }
      : null,
    projectName: row.project_name,
    activeFile: row.active_file,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

// ---------- courses ----------

function listCourses() {
  return db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM meetings m WHERE m.course_id = c.id) AS meeting_count
       FROM courses c ORDER BY c.name`,
    )
    .all()
    .map(toCourse);
}

function getCourseById(id) {
  return toCourse(db.prepare('SELECT * FROM courses WHERE id = ?').get(id));
}

function getCourseBySlug(slug) {
  return toCourse(db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug));
}

function getCourseByActiveCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return toCourse(
    db.prepare('SELECT * FROM courses WHERE access_code = ? AND code_active = 1').get(normalized),
  );
}

function createCourse(name) {
  const result = db
    .prepare('INSERT INTO courses (name, slug, access_code, created_at) VALUES (?, ?, ?, ?)')
    .run(name, uniqueSlug(name), generateAccessCode(name), now());
  return getCourseById(Number(result.lastInsertRowid));
}

function updateCourse(id, { name, codeActive }) {
  if (name !== undefined) db.prepare('UPDATE courses SET name = ? WHERE id = ?').run(name, id);
  if (codeActive !== undefined) {
    db.prepare('UPDATE courses SET code_active = ? WHERE id = ?').run(codeActive ? 1 : 0, id);
  }
  return getCourseById(id);
}

function regenerateAccessCode(id) {
  const course = getCourseById(id);
  if (!course) return null;
  db.prepare('UPDATE courses SET access_code = ? WHERE id = ?').run(generateAccessCode(course.name), id);
  return getCourseById(id);
}

function deleteCourse(id) {
  db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  cleanupOrphanBlobs();
}

// ---------- meetings ----------

const MEETING_SELECT = `
  SELECT m.*, p.number AS parent_number, p.title AS parent_title
  FROM meetings m LEFT JOIN meetings p ON p.id = m.continues_from
`;

function listMeetings(courseId, { studentView = false } = {}) {
  const filter = studentView ? "AND m.visible = 1 AND m.status != 'draft'" : '';
  return db
    .prepare(`${MEETING_SELECT} WHERE m.course_id = ? ${filter} ORDER BY m.number`)
    .all(courseId)
    .map(toMeeting);
}

function getMeeting(id) {
  return toMeeting(db.prepare(`${MEETING_SELECT} WHERE m.id = ?`).get(id));
}

function getMeetingTree(id) {
  const row = db.prepare('SELECT tree FROM meetings WHERE id = ?').get(id);
  return row ? JSON.parse(row.tree) : [];
}

function createMeeting(courseId, { title = '', number } = {}) {
  const nextNumber =
    number ??
    db.prepare('SELECT COALESCE(MAX(number), 0) + 1 AS n FROM meetings WHERE course_id = ?').get(courseId).n;
  const id = nanoid(10);
  db.prepare('INSERT INTO meetings (id, course_id, number, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    courseId,
    nextNumber,
    title,
    now(),
  );
  return getMeeting(id);
}

function updateMeeting(id, { title, visible, number }) {
  if (title !== undefined) db.prepare('UPDATE meetings SET title = ? WHERE id = ?').run(title, id);
  if (visible !== undefined) db.prepare('UPDATE meetings SET visible = ? WHERE id = ?').run(visible ? 1 : 0, id);
  if (number !== undefined) db.prepare('UPDATE meetings SET number = ? WHERE id = ?').run(number, id);
  return getMeeting(id);
}

function deleteMeeting(id) {
  db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
  cleanupOrphanBlobs();
}

function startMeeting(id, { projectName, continuesFrom }) {
  transaction(() => {
    db.prepare('DELETE FROM meeting_files WHERE meeting_id = ?').run(id);
    db.prepare(
      `UPDATE meetings
       SET status = 'live', project_name = ?, continues_from = ?, tree = '[]', active_file = NULL,
           started_at = ?, ended_at = NULL
       WHERE id = ?`,
    ).run(projectName, continuesFrom, now(), id);
  });
  cleanupOrphanBlobs();
  return getMeeting(id);
}

function finishMeeting(id) {
  db.prepare("UPDATE meetings SET status = 'finished', ended_at = ? WHERE id = ? AND status = 'live'").run(
    now(),
    id,
  );
  cleanupOrphanBlobs();
}

// Nama diketik sendiri oleh mahasiswa tanpa akun, jadi ini catatan kehadiran
// yang dilaporkan sendiri -- bukan bukti identitas.
function recordViewer(meetingId, name) {
  const at = now();
  db.prepare(
    `INSERT INTO meeting_viewers (meeting_id, name, first_seen, last_seen, visits)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT (meeting_id, name) DO UPDATE
     SET last_seen = excluded.last_seen, visits = visits + 1`,
  ).run(meetingId, name, at, at);
}

function listViewers(meetingId) {
  return db
    .prepare(
      `SELECT name, first_seen AS firstSeen, last_seen AS lastSeen, visits
       FROM meeting_viewers WHERE meeting_id = ? ORDER BY first_seen`,
    )
    .all(meetingId);
}

function setMeetingTree(id, tree) {
  db.prepare('UPDATE meetings SET tree = ? WHERE id = ?').run(JSON.stringify(tree), id);
}

function setActiveFile(id, filePath) {
  db.prepare('UPDATE meetings SET active_file = ? WHERE id = ?').run(filePath, id);
}

// ---------- files ----------

function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function getParentId(meetingId) {
  return db.prepare('SELECT continues_from FROM meetings WHERE id = ?').get(meetingId)?.continues_from ?? null;
}

function changeFor(parentId, filePath, hash) {
  if (!parentId) return null;
  const parent = db
    .prepare('SELECT hash FROM meeting_files WHERE meeting_id = ? AND path = ?')
    .get(parentId, filePath);
  if (!parent) return 'new';
  return parent.hash !== hash ? 'modified' : null;
}

function upsertFile(meetingId, { path: filePath, kind, content, language, updatedAt }) {
  const hash = kind === 'text' ? hashContent(content) : null;
  transaction(() => {
    if (hash) db.prepare('INSERT OR IGNORE INTO blobs (hash, content) VALUES (?, ?)').run(hash, content);
    db.prepare(
      `INSERT INTO meeting_files (meeting_id, path, kind, language, hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (meeting_id, path) DO UPDATE
       SET kind = excluded.kind, language = excluded.language, hash = excluded.hash, updated_at = excluded.updated_at`,
    ).run(meetingId, filePath, kind, language ?? null, hash, updatedAt);
  });
  return changeFor(getParentId(meetingId), filePath, hash);
}

function deleteFile(meetingId, filePath) {
  db.prepare('DELETE FROM meeting_files WHERE meeting_id = ? AND path = ?').run(meetingId, filePath);
}

function getFile(meetingId, filePath) {
  const row = db
    .prepare(
      `SELECT f.kind, f.language, f.updated_at, b.content
       FROM meeting_files f LEFT JOIN blobs b ON b.hash = f.hash
       WHERE f.meeting_id = ? AND f.path = ?`,
    )
    .get(meetingId, filePath);
  if (!row) return null;
  return { kind: row.kind, content: row.content, language: row.language, updatedAt: row.updated_at };
}

function getChanges(meetingId) {
  const parentId = getParentId(meetingId);
  if (!parentId) return {};
  const rows = db
    .prepare(
      `SELECT f.path, p.path AS parent_path, f.hash, p.hash AS parent_hash
       FROM meeting_files f
       LEFT JOIN meeting_files p ON p.meeting_id = ? AND p.path = f.path
       WHERE f.meeting_id = ?`,
    )
    .all(parentId, meetingId);

  const changes = {};
  for (const row of rows) {
    if (row.parent_path === null) changes[row.path] = 'new';
    else if (row.hash !== row.parent_hash) changes[row.path] = 'modified';
  }
  return changes;
}

function cleanupOrphanBlobs() {
  db.exec('DELETE FROM blobs WHERE hash NOT IN (SELECT hash FROM meeting_files WHERE hash IS NOT NULL)');
}

module.exports = {
  isUniqueViolation,
  normalizeCode,
  listCourses,
  getCourseById,
  getCourseBySlug,
  getCourseByActiveCode,
  createCourse,
  updateCourse,
  regenerateAccessCode,
  deleteCourse,
  listMeetings,
  getMeeting,
  getMeetingTree,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  startMeeting,
  finishMeeting,
  recordViewer,
  listViewers,
  setMeetingTree,
  setActiveFile,
  upsertFile,
  deleteFile,
  getFile,
  getChanges,
};
