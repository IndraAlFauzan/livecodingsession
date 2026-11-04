const express = require('express');
const db = require('./db');
const live = require('./live');
const { requireTeacher, requireAdmin, mayTouchCourse, resolveTeacher, bearer } = require('./auth');
const {
  hashPassword,
  verifyPassword,
  newSessionToken,
  tempPassword,
  cleanNim,
  cleanUsername,
  cleanTeacherCode,
  checkPassword,
} = require('./studentAuth');
const throttle = require('./loginThrottle');

// Express 4 tidak menangkap penolakan promise dari handler async; pembungkus ini
// meneruskannya ke penangan galat supaya tidak jadi permintaan yang menggantung.
function aman(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0 && value < 1000;
}

// Pencarian objek + 404 + pemeriksaan kepemilikan, dijadikan satu di sini.
// Sengaja di loader, bukan di tiap rute: rute baru otomatis ikut terlindungi.
//
// Mata kuliah milik dosen lain dijawab 404, bukan 403 -- jawaban 403 akan
// membocorkan bahwa mata kuliah dengan id itu ada.
function loadCourse(req, res, next) {
  const course = db.getCourseById(Number(req.params.id));
  if (!course || !mayTouchCourse(req.auth, course)) {
    return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
  }
  req.course = course;
  next();
}

function loadMeeting(req, res, next) {
  const meeting = db.getMeeting(req.params.id);
  const course = meeting && db.getCourseById(meeting.courseId);
  if (!meeting || !mayTouchCourse(req.auth, course)) {
    return res.status(404).json({ error: 'Pertemuan tidak ditemukan.' });
  }
  req.meeting = meeting;
  req.course = course;
  next();
}

function withLiveFlag(meeting) {
  return {
    ...meeting,
    teacherConnected: live.hasTeacher(meeting.id),
    reconnecting: live.isReconnecting(meeting.id),
  };
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

// Masuk sebagai dosen. Di depan dinding, karena di sinilah tanda sesinya dibuat.
admin.post(
  '/login',
  aman(async (req, res) => {
    const username = cleanUsername(req.body?.username);
    const baris = username ? db.getTeacherRowByUsername(username) : null;

    const sisa = username ? throttle.sisaKuncian(`dosen:${username}`) : 0;
    if (sisa > 0) {
      const menit = Math.ceil(sisa / 60000);
      return res
        .status(429)
        .set('retry-after', String(Math.ceil(sisa / 1000)))
        .json({ error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.` });
    }

    // Pesan sama untuk username tak dikenal, sandi salah, dan akun nonaktif --
    // supaya tidak bisa dipakai menebak siapa yang terdaftar.
    const salah = () => {
      if (username) throttle.catatGagal(`dosen:${username}`);
      return res.status(401).json({ error: 'Username atau kata sandi salah.' });
    };
    if (!baris || baris.active !== 1) return salah();
    if (!(await verifyPassword(req.body?.password ?? '', baris.password_hash))) return salah();

    throttle.hapusCatatan(`dosen:${username}`);
    const token = db.createTeacherSession(baris.id, newSessionToken());
    db.markTeacherLogin(baris.id);
    res.json({ teacher: { id: baris.id, username: baris.username, code: baris.code, name: baris.name }, token });
  }),
);

admin.use(requireTeacher);

admin.post('/logout', (req, res) => {
  db.deleteTeacherSession(bearer(req) ?? '');
  res.status(204).end();
});

admin.get('/check', (req, res) => {
  res.json({
    ok: true,
    admin: req.auth.admin,
    teacher: req.auth.teacher && {
      id: req.auth.teacher.id,
      username: req.auth.teacher.username,
      code: req.auth.teacher.code,
      name: req.auth.teacher.name,
    },
  });
});

admin.get('/courses', (req, res) => {
  res.json({ courses: db.listCourses(req.auth.teacherId) });
});

admin.post('/courses', (req, res) => {
  const name = cleanText(req.body?.name, 100);
  if (!name) return res.status(400).json({ error: 'Nama mata kuliah wajib diisi (maks. 100 karakter).' });
  // Dibuat dosen -> miliknya. Dibuat admin kampus -> tanpa pemilik.
  res.status(201).json({ course: db.createCourse(name, req.auth.teacherId) });
});

admin.patch('/courses/:id', loadCourse, (req, res) => {
  const changes = {};
  if (req.body?.name !== undefined) {
    changes.name = cleanText(req.body.name, 100);
    if (!changes.name) return res.status(400).json({ error: 'Nama mata kuliah tidak valid.' });
  }
  if (req.body?.codeActive !== undefined) changes.codeActive = Boolean(req.body.codeActive);

  res.json({ course: db.updateCourse(req.course.id, changes) });
});

admin.post('/courses/:id/regenerate-code', loadCourse, (req, res) => {
  res.json({ course: db.regenerateAccessCode(req.course.id) });
});

admin.get('/courses/:id/students', loadCourse, (req, res) => {
  res.json({ students: db.listCourseStudents(req.course.id) });
});

// Dosen tidak bisa membaca kata sandi siapa pun; yang bisa dilakukan hanya
// menggantinya dengan yang baru. Sandi itu dikembalikan sekali di sini untuk
// dibacakan ke mahasiswa, dan tidak pernah bisa dibaca lagi sesudahnya.
admin.post(
  '/students/:nim/reset-password',
  aman(async (req, res) => {
    const nim = cleanNim(req.params.nim);
    const akun = nim ? db.getStudentRowByNim(nim) : null;
    // Dosen hanya boleh menolong mahasiswa di mata kuliahnya sendiri; kalau
    // tidak, siapa pun yang punya akun dosen bisa mereset siapa saja.
    const boleh = akun && (req.auth.admin || db.studentSharesCourseWith(akun.id, req.auth.teacherId));
    if (!boleh) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan.' });

    const sandi = tempPassword();
    db.setStudentPassword(akun.id, await hashPassword(sandi));
    // Semua perangkat dikeluarkan: kalau akunnya memang diambil alih orang lain,
    // mengganti sandi saja tidak memutus sesi yang sudah terlanjur berjalan.
    const sesiDicabut = db.deleteSessionsOfStudent(akun.id);
    throttle.hapusCatatan(nim);

    res.json({ student: { nim: akun.nim, name: akun.name }, password: sandi, sessionsRevoked: sesiDicabut });
  }),
);

// Jalan keluar untuk akun yang salah daftar; sesi dan riwayatnya ikut terhapus
// lewat ON DELETE CASCADE.
// ---------- akun dosen (admin kampus saja) ----------

admin.get('/teachers', requireAdmin, (_req, res) => {
  res.json({ teachers: db.listTeachers() });
});

admin.post(
  '/teachers',
  requireAdmin,
  aman(async (req, res) => {
    const username = cleanUsername(req.body?.username);
    if (!username) {
      return res.status(400).json({ error: 'Username 3-30 karakter: huruf, angka, titik, garis bawah, atau strip.' });
    }

    const code = cleanTeacherCode(req.body?.code);
    if (!code) return res.status(400).json({ error: 'Kode dosen harus 2-10 huruf atau angka, misalnya OCH.' });

    const name = cleanText(req.body?.name, 100);
    if (!name) return res.status(400).json({ error: 'Nama dosen tidak valid.' });

    if (db.getTeacherRowByUsername(username)) {
      return res.status(409).json({ error: `Username ${username} sudah dipakai.` });
    }
    if (db.getTeacherRowByCode(code)) {
      return res.status(409).json({ error: `Kode dosen ${code} sudah dipakai.` });
    }

    // Sandi awal dibuat server dan ditampilkan sekali, sama seperti reset
    // mahasiswa -- jadi tidak ada sandi yang dikirim lewat chat.
    const sandi = tempPassword();
    const dosen = db.createTeacher({ username, code, name, passwordHash: await hashPassword(sandi) });
    res.status(201).json({ teacher: dosen, password: sandi });
  }),
);

admin.post(
  '/teachers/:id/reset-password',
  requireAdmin,
  aman(async (req, res) => {
    const dosen = db.getTeacherById(Number(req.params.id));
    if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan.' });

    const sandi = tempPassword();
    db.setTeacherPassword(dosen.id, await hashPassword(sandi));
    const dicabut = db.deleteSessionsOfTeacher(dosen.id);
    res.json({ teacher: dosen, password: sandi, sessionsRevoked: dicabut });
  }),
);

// Dinonaktifkan, bukan dihapus: mata kuliahnya tetap utuh dan tidak kehilangan
// pemilik, tapi dosennya langsung tidak bisa masuk lagi.
admin.patch('/teachers/:id', requireAdmin, (req, res) => {
  const dosen = db.getTeacherById(Number(req.params.id));
  if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan.' });

  if (req.body?.active !== undefined) {
    db.setTeacherActive(dosen.id, Boolean(req.body.active));
    if (!req.body.active) db.deleteSessionsOfTeacher(dosen.id);
  }
  res.json({ teacher: db.getTeacherById(dosen.id) });
});

// Memindahkan mata kuliah ke dosen lain, atau melepasnya kembali ke admin.
admin.patch('/courses/:id/owner', requireAdmin, (req, res) => {
  const course = db.getCourseById(Number(req.params.id));
  if (!course) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });

  const teacherId = req.body?.teacherId ?? null;
  if (teacherId !== null && !db.getTeacherById(Number(teacherId))) {
    return res.status(404).json({ error: 'Dosen tidak ditemukan.' });
  }
  db.setCourseOwner(course.id, teacherId === null ? null : Number(teacherId));
  res.json({ course: db.getCourseById(course.id) });
});

admin.delete('/students/:nim', requireAdmin, (req, res) => {
  const nim = cleanNim(req.params.nim);
  const akun = nim ? db.getStudentRowByNim(nim) : null;
  if (!akun) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan.' });
  db.deleteStudent(akun.id);
  res.status(204).end();
});

admin.delete('/courses/:id/students', loadCourse, (req, res) => {
  const dicabut = db.clearEnrollments(req.course.id);
  for (const meeting of db.listMeetings(req.course.id)) {
    live.kickStudents(meeting.id, 'Dosen mengeluarkan semua mahasiswa. Masuk lagi dengan kode terbaru.');
  }
  res.json({ revoked: dicabut });
});

admin.delete('/courses/:id', loadCourse, (req, res) => {
  const meetings = db.listMeetings(req.course.id);
  if (meetings.some((meeting) => live.hasTeacher(meeting.id))) {
    return res.status(409).json({ error: 'Ada pertemuan yang sedang live. Hentikan dulu sesinya.' });
  }
  for (const meeting of meetings) live.clearReconnecting(meeting.id);
  for (const meeting of meetings) live.kickStudents(meeting.id, 'Mata kuliah ini telah dihapus.');

  db.deleteCourse(req.course.id);
  res.status(204).end();
});

admin.get('/courses/:id/meetings', loadCourse, (req, res) => {
  res.json({ course: req.course, meetings: db.listMeetings(req.course.id).map(withLiveFlag) });
});

admin.post('/courses/:id/meetings', loadCourse, (req, res) => {
  const title = req.body?.title === undefined ? '' : cleanText(req.body.title, 200);
  if (title === null) return res.status(400).json({ error: 'Judul pertemuan tidak valid (maks. 200 karakter).' });

  const number = req.body?.number;
  if (number !== undefined && !isPositiveInt(number)) {
    return res.status(400).json({ error: 'Nomor pertemuan harus bilangan bulat positif.' });
  }

  try {
    res.status(201).json({ meeting: withLiveFlag(db.createMeeting(req.course.id, { title, number })) });
  } catch (error) {
    if (db.isUniqueViolation(error)) {
      return res.status(409).json({ error: `Pertemuan ${number} sudah ada di mata kuliah ini.` });
    }
    throw error;
  }
});

admin.patch('/meetings/:id', loadMeeting, (req, res) => {
  const { meeting } = req;
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

admin.get('/meetings/:id/viewers', loadMeeting, (req, res) => {
  const { meeting } = req;
  res.json({ viewers: db.listViewers(meeting.id), watchingNow: live.listViewers(meeting.id) });
});

admin.delete('/meetings/:id', loadMeeting, (req, res) => {
  const { meeting } = req;
  if (live.hasTeacher(meeting.id)) {
    return res.status(409).json({ error: 'Pertemuan sedang live. Hentikan dulu sesinya dari VS Code.' });
  }
  // Menghapus adalah perintah tegas dosen; tidak perlu menunggu masa tenggang habis.
  live.clearReconnecting(meeting.id);

  live.kickStudents(meeting.id, 'Pertemuan ini telah dihapus.');
  db.deleteMeeting(meeting.id);
  res.status(204).end();
});

// ---------- mahasiswa ----------

const student = express.Router();

function toSessionReply(student, token) {
  return { student: { nim: student.nim, name: student.name }, token };
}

// Identitas diambil dari tanda sesi di server, tidak pernah dari badan permintaan;
// inilah yang menutup celah masuk memakai nama orang lain.
function requireStudent(req, res, next) {
  const akun = db.getStudentBySession(req.get('x-student-token'));
  if (!akun) return res.status(401).json({ error: 'Silakan masuk dulu.' });
  req.student = akun;
  next();
}

student.post(
  '/register',
  aman(async (req, res) => {
    const nim = cleanNim(req.body?.nim);
    if (!nim) return res.status(400).json({ error: 'NIM harus 5-20 huruf atau angka.' });

    const name = cleanText(req.body?.name, 100);
    if (!name) return res.status(400).json({ error: 'Nama tidak valid.' });

    const keluhan = checkPassword(req.body?.password);
    if (keluhan) return res.status(400).json({ error: keluhan });

    if (db.getStudentRowByNim(nim)) {
      return res.status(409).json({ error: 'NIM ini sudah terdaftar. Silakan masuk.' });
    }

    const akun = db.createStudent({ nim, name, passwordHash: await hashPassword(req.body.password) });
    const token = db.createSession(akun.id, newSessionToken());
    db.markStudentLogin(akun.id);
    res.status(201).json(toSessionReply(akun, token));
  }),
);

student.post(
  '/login',
  aman(async (req, res) => {
    const nim = cleanNim(req.body?.nim);

    const sisa = nim ? throttle.sisaKuncian(nim) : 0;
    if (sisa > 0) {
      const menit = Math.ceil(sisa / 60000);
      return res
        .status(429)
        .set('retry-after', String(Math.ceil(sisa / 1000)))
        .json({ error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.` });
    }

    const baris = nim ? db.getStudentRowByNim(nim) : null;
    // Pesan yang sama untuk NIM tak dikenal dan sandi salah, supaya tidak bisa
    // dipakai menebak NIM mana yang terdaftar.
    const salah = () => {
      if (nim) throttle.catatGagal(nim);
      return res.status(401).json({ error: 'NIM atau kata sandi salah.' });
    };
    if (!baris) return salah();
    if (!(await verifyPassword(req.body?.password ?? '', baris.password_hash))) return salah();

    throttle.hapusCatatan(nim);
    const token = db.createSession(baris.id, newSessionToken());
    db.markStudentLogin(baris.id);
    res.json(toSessionReply(baris, token));
  }),
);

student.post('/logout', (req, res) => {
  db.deleteSession(req.get('x-student-token') ?? '');
  res.status(204).end();
});

student.post(
  '/password',
  requireStudent,
  aman(async (req, res) => {
    const baris = db.getStudentRowByNim(req.student.nim);
    if (!(await verifyPassword(req.body?.currentPassword ?? '', baris.password_hash))) {
      return res.status(401).json({ error: 'Kata sandi lama salah.' });
    }

    const keluhan = checkPassword(req.body?.newPassword);
    if (keluhan) return res.status(400).json({ error: keluhan });
    if (req.body.newPassword === req.body.currentPassword) {
      return res.status(400).json({ error: 'Kata sandi baru harus berbeda dari yang lama.' });
    }

    db.setStudentPassword(baris.id, await hashPassword(req.body.newPassword));
    // Perangkat ini tetap masuk; perangkat lain dikeluarkan. Kalau sandi lama
    // sempat bocor, mengganti sandi saja tidak memutus sesi yang sudah jalan.
    const dikeluarkan = db.deleteOtherSessions(baris.id, req.get('x-student-token'));
    throttle.hapusCatatan(baris.nim);

    res.json({ otherSessionsRevoked: dikeluarkan });
  }),
);

// Satu panggilan untuk seluruh beranda. Sebelumnya halaman daftar memanggil
// satu permintaan per mata kuliah tiap 30 detik hanya untuk tahu mana yang live.
student.get('/home', requireStudent, (req, res) => {
  // Status 'live' di database belum tentu benar kalau dosen putus tanpa menutup
  // sesi; yang menentukan adalah ada-tidaknya koneksi dosen saat ini.
  // Sesi live ditempelkan ke mata kuliahnya, bukan jadi daftar terpisah: satu
  // sumber kebenaran, dan beranda tinggal menyaring yang punya `live`.
  const liveTiapKelas = new Map();
  for (const m of db.listLiveMeetingsFor(req.student.id)) {
    if (!live.hasTeacher(m.id) && !live.isReconnecting(m.id)) continue;
    liveTiapKelas.set(m.courseSlug, {
      id: m.id,
      number: m.number,
      title: m.title,
      startedAt: m.startedAt,
      reconnecting: !live.hasTeacher(m.id),
    });
  }

  const courses = db.listEnrolledCourses(req.student.id).map((c) => ({
    slug: c.slug,
    name: c.name,
    teacher: c.teacherCode ? { code: c.teacherCode, name: c.teacherName } : null,
    joinedAt: c.joinedAt,
    meetingCount: c.meetingCount,
    latest: c.latestNumber == null ? null : { number: c.latestNumber, title: c.latestTitle },
    live: liveTiapKelas.get(c.slug) || null,
  }));

  const recent = db.listRecentMeetingsFor(req.student.id).map((m) => ({
    course: { slug: m.courseSlug, name: m.courseName, teacher: m.teacherCode ? { code: m.teacherCode } : null },
    meeting: { id: m.id, number: m.number, title: m.title, status: m.status, startedAt: m.startedAt },
    lastSeen: m.lastSeen,
  }));

  res.json({
    student: { nim: req.student.nim, name: req.student.name },
    courses,
    recent,
  });
});

student.get('/me', requireStudent, (req, res) => {
  res.json({ student: { nim: req.student.nim, name: req.student.name }, courses: db.listEnrolledCourses(req.student.id) });
});

// Kode kelas dipakai sekali saat bergabung. Sesudahnya yang berlaku adalah
// pendaftaran, jadi dosen bisa mengganti kode tanpa melempar keluar yang sudah masuk.
student.post('/courses', requireStudent, (req, res) => {
  const course = db.getCourseByActiveCode(req.body?.code);
  if (!course) return res.status(404).json({ error: 'Kode akses tidak valid atau sudah dinonaktifkan.' });

  db.enrollStudent(course.id, req.student.id);
  res.json({ course: { slug: course.slug, name: course.name, teacher: course.teacher } });
});

student.get('/courses', requireStudent, (req, res) => {
  res.json({ courses: db.listEnrolledCourses(req.student.id) });
});

// Keluar dari kelas: riwayatnya hilang dari daftar, tapi akunnya tetap. Untuk
// masuk lagi mahasiswa perlu kode akses yang berlaku saat itu.
student.delete('/courses/:slug', requireStudent, (req, res) => {
  const course = db.getCourseBySlug(req.params.slug);
  if (!course) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
  db.unenrollStudent(course.id, req.student.id);
  res.status(204).end();
});

student.get('/courses/:slug', requireStudent, (req, res) => {
  const course = db.getCourseBySlug(req.params.slug);
  if (!course || !db.isEnrolled(course.id, req.student.id)) {
    return res.status(403).json({ error: 'Kamu belum bergabung di mata kuliah ini.' });
  }
  res.json({
    course: { slug: course.slug, name: course.name, teacher: course.teacher },
    meetings: db.listMeetings(course.id, { studentView: true }).map(toStudentMeeting),
  });
});

module.exports = { admin, student };
