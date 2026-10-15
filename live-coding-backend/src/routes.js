const express = require('express');
const db = require('./db');
const live = require('./live');
const { requireTeacherToken } = require('./auth');

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0 && value < 1000;
}

function withLiveFlag(meeting) {
  return { ...meeting, teacherConnected: live.hasTeacher(meeting.id) };
}

function toStudentMeeting(meeting) {
  return {
    id: meeting.id,
    number: meeting.number,
    title: meeting.title,
    status: meeting.status,
    continuesFrom: meeting.continuesFrom,
    projectName: meeting.projectName,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
  };
}

// ---------- admin (dosen) ----------

const admin = express.Router();
admin.use(requireTeacherToken);

admin.get('/check', (_req, res) => res.json({ ok: true }));

admin.get('/courses', (_req, res) => {
  res.json({ courses: db.listCourses() });
});

admin.post('/courses', (req, res) => {
  const name = cleanText(req.body?.name, 100);
  if (!name) return res.status(400).json({ error: 'Nama mata kuliah wajib diisi (maks. 100 karakter).' });
  res.status(201).json({ course: db.createCourse(name) });
});

admin.patch('/courses/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.getCourseById(id)) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });

  const changes = {};
  if (req.body?.name !== undefined) {
    changes.name = cleanText(req.body.name, 100);
    if (!changes.name) return res.status(400).json({ error: 'Nama mata kuliah tidak valid.' });
  }
  if (req.body?.codeActive !== undefined) changes.codeActive = Boolean(req.body.codeActive);

  res.json({ course: db.updateCourse(id, changes) });
});

admin.post('/courses/:id/regenerate-code', (req, res) => {
  const course = db.regenerateAccessCode(Number(req.params.id));
  if (!course) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
  res.json({ course });
});

admin.delete('/courses/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.getCourseById(id)) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });

  const meetings = db.listMeetings(id);
  if (meetings.some((meeting) => live.hasTeacher(meeting.id))) {
    return res.status(409).json({ error: 'Ada pertemuan yang sedang live. Hentikan dulu sesinya.' });
  }
  for (const meeting of meetings) live.kickStudents(meeting.id, 'Mata kuliah ini telah dihapus.');

  db.deleteCourse(id);
  res.status(204).end();
});

admin.get('/courses/:id/meetings', (req, res) => {
  const id = Number(req.params.id);
  const course = db.getCourseById(id);
  if (!course) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
  res.json({ course, meetings: db.listMeetings(id).map(withLiveFlag) });
});

admin.post('/courses/:id/meetings', (req, res) => {
  const id = Number(req.params.id);
  if (!db.getCourseById(id)) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });

  const title = req.body?.title === undefined ? '' : cleanText(req.body.title, 200);
  if (title === null) return res.status(400).json({ error: 'Judul pertemuan tidak valid (maks. 200 karakter).' });

  const number = req.body?.number;
  if (number !== undefined && !isPositiveInt(number)) {
    return res.status(400).json({ error: 'Nomor pertemuan harus bilangan bulat positif.' });
  }

  try {
    res.status(201).json({ meeting: withLiveFlag(db.createMeeting(id, { title, number })) });
  } catch (error) {
    if (db.isUniqueViolation(error)) {
      return res.status(409).json({ error: `Pertemuan ${number} sudah ada di mata kuliah ini.` });
    }
    throw error;
  }
});

admin.patch('/meetings/:id', (req, res) => {
  const meeting = db.getMeeting(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Pertemuan tidak ditemukan.' });

  const changes = {};
  if (req.body?.title !== undefined) {
    changes.title = req.body.title === '' ? '' : cleanText(req.body.title, 200);
    if (changes.title === null) return res.status(400).json({ error: 'Judul pertemuan tidak valid.' });
  }
  if (req.body?.visible !== undefined) changes.visible = Boolean(req.body.visible);
  if (req.body?.number !== undefined) {
    if (!isPositiveInt(req.body.number)) {
      return res.status(400).json({ error: 'Nomor pertemuan harus bilangan bulat positif.' });
    }
    changes.number = req.body.number;
  }

  let updated;
  try {
    updated = db.updateMeeting(meeting.id, changes);
  } catch (error) {
    if (db.isUniqueViolation(error)) {
      return res.status(409).json({ error: `Pertemuan ${changes.number} sudah ada di mata kuliah ini.` });
    }
    throw error;
  }

  if (changes.visible === false) {
    live.kickStudents(meeting.id, 'Pertemuan ini disembunyikan oleh dosen.');
  }
  res.json({ meeting: withLiveFlag(updated) });
});

admin.delete('/meetings/:id', (req, res) => {
  const meeting = db.getMeeting(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Pertemuan tidak ditemukan.' });
  if (live.hasTeacher(meeting.id)) {
    return res.status(409).json({ error: 'Pertemuan sedang live. Hentikan dulu sesinya dari VS Code.' });
  }

  live.kickStudents(meeting.id, 'Pertemuan ini telah dihapus.');
  db.deleteMeeting(meeting.id);
  res.status(204).end();
});

// ---------- mahasiswa ----------

const student = express.Router();

student.post('/access', (req, res) => {
  const course = db.getCourseByActiveCode(req.body?.code);
  if (!course) return res.status(404).json({ error: 'Kode akses tidak valid atau sudah dinonaktifkan.' });
  res.json({ course: { slug: course.slug, name: course.name } });
});

student.get('/courses/:slug', (req, res) => {
  const course = db.getCourseByActiveCode(req.get('x-access-code'));
  if (!course || course.slug !== req.params.slug) {
    return res.status(403).json({ error: 'Kode akses tidak valid untuk mata kuliah ini.' });
  }
  res.json({
    course: { slug: course.slug, name: course.name },
    meetings: db.listMeetings(course.id, { studentView: true }).map(toStudentMeeting),
  });
});

module.exports = { admin, student };
