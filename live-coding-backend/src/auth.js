const crypto = require('crypto');
const { config } = require('./config');
const db = require('./db');

// Kunci admin kampus dari env. Tetap berlaku setelah akun dosen ada: dipakai
// membuat akun, dan melihat seluruh mata kuliah termasuk yang belum berpemilik.
function isTeacherToken(token) {
  if (typeof token !== 'string') return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(config.teacherToken);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function bearer(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Satu tempat yang memutuskan siapa pemanggilnya. Dua bentuk diterima:
// kunci admin kampus, atau tanda sesi milik satu dosen.
//
//   { admin: true,  teacher: null, teacherId: null }  -> lihat & ubah semuanya
//   { admin: false, teacher: {...}, teacherId: 7   }  -> hanya miliknya
function resolveTeacher(token) {
  if (isTeacherToken(token)) return { admin: true, teacher: null, teacherId: null };
  const teacher = db.getTeacherBySession(token);
  return teacher ? { admin: false, teacher, teacherId: teacher.id } : null;
}

function requireTeacher(req, res, next) {
  const siapa = resolveTeacher(bearer(req));
  if (!siapa) return res.status(401).json({ error: 'Sesi dosen tidak valid. Masuk lagi.' });
  req.auth = siapa;
  next();
}

// Sebagian tindakan terlalu luas untuk satu dosen: membuat dan menghapus akun
// dosen, serta menghapus akun mahasiswa.
function requireAdmin(req, res, next) {
  if (!req.auth?.admin) {
    return res.status(403).json({ error: 'Hanya admin kampus yang boleh melakukan ini.' });
  }
  next();
}

// Mata kuliah tanpa pemilik (warisan sebelum akun dosen ada) milik admin.
function mayTouchCourse(auth, course) {
  return auth.admin || (course?.teacherId != null && course.teacherId === auth.teacherId);
}

module.exports = { isTeacherToken, resolveTeacher, requireTeacher, requireAdmin, mayTouchCourse, bearer };
