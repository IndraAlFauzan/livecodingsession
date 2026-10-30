// Uji alur lengkap: node examples/smoke-test.js
// Env: BACKEND_URL (default http://localhost:3000), TEACHER_TOKEN.
// Membuat data uji (mata kuliah "Uji ...") lalu menghapusnya di akhir.
const WebSocket = require('ws');

const BASE = process.env.BACKEND_URL || 'http://localhost:3000';
const WS_URL = BASE.replace(/^http/, 'ws');
const TOKEN = process.env.TEACHER_TOKEN || 'change-this-secret-token';

let passed = 0;
function check(condition, label) {
  if (!condition) throw new Error(`GAGAL: ${label}`);
  passed++;
  console.log(`  ok  ${label}`);
}

async function api(method, path, { body, token, student } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (student) headers['x-student-token'] = student;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const admin = (method, path, body) => api(method, path, { body, token: TOKEN });

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const queue = [];
    const waiters = [];
    ws.closed = false;
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      const i = waiters.findIndex((w) => w.type === msg.type);
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
      else queue.push(msg);
    });
    ws.on('close', () => (ws.closed = true));
    ws.on('error', reject);
    ws.sendJson = (payload) => ws.send(JSON.stringify(payload));
    ws.next = (type, timeout = 2000) => {
      const i = queue.findIndex((m) => m.type === type);
      if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
      return new Promise((res, rej) => {
        const waiter = { type, resolve: res };
        waiters.push(waiter);
        setTimeout(() => {
          const j = waiters.indexOf(waiter);
          if (j >= 0) {
            waiters.splice(j, 1);
            rej(new Error(`Timeout menunggu "${type}"`));
          }
        }, timeout);
      });
    };
    ws.on('open', async () => {
      await ws.next('connected');
      resolve(ws);
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// NIM harus unik; diacak supaya uji ini bisa dijalankan berulang kali
// pada database yang sama tanpa bentrok dengan sisa jalannya yang lalu.
const nimUji = (akhiran) => `UJI${Math.floor(Math.random() * 90000 + 10000)}${akhiran}`;
const tree = (...paths) => paths.map((p) => ({ name: p, path: p, type: 'file' }));

async function main() {
  console.log(`Backend: ${BASE}\n`);

  console.log('Admin & mata kuliah');
  check((await api('GET', '/api/admin/check')).status === 401, 'admin tanpa token ditolak');
  check((await admin('GET', '/api/admin/check')).status === 200, 'admin dengan token diterima');

  const mobile = (await admin('POST', '/api/admin/courses', { name: 'Uji Pemrograman Mobile' })).data.course;
  const basdat = (await admin('POST', '/api/admin/courses', { name: 'Uji Basis Data' })).data.course;
  check(/^UPM-[A-Z2-9]{6}$/.test(mobile.accessCode), `kode akses dibuat (${mobile.accessCode})`);
  check(mobile.slug !== basdat.slug && mobile.accessCode !== basdat.accessCode, 'slug dan kode unik per mata kuliah');
  check((await admin('POST', '/api/admin/courses', { name: '  ' })).status === 400, 'nama kosong ditolak');

  const p1 = (await admin('POST', `/api/admin/courses/${mobile.id}/meetings`, { title: 'Dart Dasar' })).data.meeting;
  const p2 = (await admin('POST', `/api/admin/courses/${mobile.id}/meetings`, { title: 'Lanjutan' })).data.meeting;
  check(p1.number === 1 && p2.number === 2 && p1.status === 'draft', 'pertemuan bernomor otomatis, status draft');
  const dup = await admin('POST', `/api/admin/courses/${mobile.id}/meetings`, { number: 1 });
  check(dup.status === 409, 'nomor pertemuan ganda ditolak');

  console.log('\nAkun mahasiswa');
  const nimRina = nimUji('A');
  const nimBudi = nimUji('B');
  const daftar = await api('POST', '/api/student/register', {
    body: { nim: nimRina, name: 'Rina Aprilia', password: 'rahasia123' },
  });
  check(daftar.status === 201 && daftar.data.student.nim === nimRina, 'mahasiswa bisa mendaftar');
  let rina = daftar.data.token;
  check(
    (await api('POST', '/api/student/register', { body: { nim: nimRina, name: 'Kembar', password: 'rahasia123' } })).status === 409,
    'NIM ganda ditolak',
  );
  check(
    (await api('POST', '/api/student/register', { body: { nim: nimUji('C'), name: 'Pendek', password: 'abc' } })).status === 400,
    'kata sandi di bawah 8 karakter ditolak',
  );
  check((await api('POST', '/api/student/login', { body: { nim: nimRina, password: 'salah' } })).status === 401, 'kata sandi salah ditolak');
  const masuk = await api('POST', '/api/student/login', { body: { nim: nimRina.toLowerCase(), password: 'rahasia123' } });
  check(masuk.status === 200 && masuk.data.token !== rina, 'masuk lagi memberi tanda sesi baru per perangkat');
  let rinaHp = masuk.data.token;

  const budi = (await api('POST', '/api/student/register', {
    body: { nim: nimBudi, name: 'Budi Santoso', password: 'rahasia123' },
  })).data.token;

  console.log('\nGabung kelas & riwayat');
  check((await api('GET', '/api/student/me', { student: rina })).data.courses.length === 0, 'riwayat awal kosong');
  check((await api('GET', '/api/student/me')).status === 401, 'tanpa tanda sesi ditolak');
  check(
    (await api('POST', '/api/student/courses', { student: rina, body: { code: 'SALAH-123' } })).status === 404,
    'kode kelas salah ditolak',
  );
  const gabung = await api('POST', '/api/student/courses', { student: rina, body: { code: mobile.accessCode.toLowerCase() } });
  check(gabung.status === 200 && gabung.data.course.slug === mobile.slug, 'gabung kelas (kode tidak case-sensitive)');
  await api('POST', '/api/student/courses', { student: rina, body: { code: mobile.accessCode } });
  const riwayat = (await api('GET', '/api/student/me', { student: rina })).data.courses;
  check(riwayat.length === 1 && riwayat[0].slug === mobile.slug, 'gabung dua kali tidak menggandakan riwayat');
  check(
    (await api('GET', '/api/student/me', { student: rinaHp })).data.courses.length === 1,
    'riwayat sama di perangkat lain milik akun yang sama',
  );

  console.log('\nGanti kata sandi sendiri');
  check(
    (await api('POST', '/api/student/password', { student: rina, body: { currentPassword: 'salah', newPassword: 'sandibaru123' } })).status === 401,
    'sandi lama salah ditolak',
  );
  check(
    (await api('POST', '/api/student/password', { student: rina, body: { currentPassword: 'rahasia123', newPassword: 'pendek' } })).status === 400,
    'sandi baru terlalu pendek ditolak',
  );
  check(
    (await api('POST', '/api/student/password', { student: rina, body: { currentPassword: 'rahasia123', newPassword: 'rahasia123' } })).status === 400,
    'sandi baru yang sama dengan yang lama ditolak',
  );

  const ganti = await api('POST', '/api/student/password', {
    student: rina,
    body: { currentPassword: 'rahasia123', newPassword: 'sandibaru123' },
  });
  check(ganti.status === 200, 'sandi berhasil diganti');
  check(ganti.data.otherSessionsRevoked === 1, `perangkat lain dikeluarkan (${ganti.data.otherSessionsRevoked})`);
  check((await api('GET', '/api/student/me', { student: rinaHp })).status === 401, 'perangkat lain harus masuk lagi');
  check((await api('GET', '/api/student/me', { student: rina })).status === 200, 'perangkat yang dipakai tetap masuk');
  check(
    (await api('POST', '/api/student/login', { body: { nim: nimRina, password: 'rahasia123' } })).status === 401,
    'sandi lama tidak berlaku lagi',
  );
  const pakaiBaru = await api('POST', '/api/student/login', { body: { nim: nimRina, password: 'sandibaru123' } });
  check(pakaiBaru.status === 200, 'sandi baru bisa dipakai masuk');
  rinaHp = pakaiBaru.data.token;

  console.log('\nDaftar anggota & reset kata sandi');
  const anggota = (await admin('GET', `/api/admin/courses/${mobile.id}/students`)).data.students;
  check(anggota.length === 1 && anggota[0].nim === nimRina, 'dosen melihat daftar anggota kelas');
  check(anggota[0].name === 'Rina Aprilia' && Boolean(anggota[0].joinedAt), 'anggota membawa nama dan waktu gabung');

  const reset = await admin('POST', `/api/admin/students/${nimRina}/reset-password`);
  check(reset.status === 200 && /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(reset.data.password), 'sandi sementara dibuat');
  check(reset.data.sessionsRevoked >= 2, `semua perangkat dikeluarkan (${reset.data.sessionsRevoked} sesi)`);
  check((await api('GET', '/api/student/me', { student: rinaHp })).status === 401, 'tanda sesi lama mati setelah reset');
  check(
    (await api('POST', '/api/student/login', { body: { nim: nimRina, password: 'sandibaru123' } })).status === 401,
    'sandi pilihan mahasiswa ditimpa reset dosen',
  );
  const masukBaru = await api('POST', '/api/student/login', { body: { nim: nimRina, password: reset.data.password } });
  check(masukBaru.status === 200, 'sandi sementara bisa dipakai masuk');
  rina = masukBaru.data.token;
  check(
    (await api('GET', '/api/student/me', { student: rina })).data.courses.length === 1,
    'riwayat mata kuliah selamat dari reset sandi',
  );
  check((await admin('POST', '/api/admin/students/NIMPALSU9/reset-password')).status === 404, 'reset NIM tak dikenal ditolak');

  console.log('\nPembatasan percobaan masuk');
  const nimTarget = nimUji('D');
  await api('POST', '/api/student/register', { body: { nim: nimTarget, name: 'Target Uji', password: 'rahasia123' } });
  let status429 = null;
  for (let i = 0; i < 12 && status429 === null; i++) {
    const r = await api('POST', '/api/student/login', { body: { nim: nimTarget, password: 'tebakan-salah' } });
    if (r.status === 429) status429 = i + 1;
  }
  check(status429 === 11, `dikunci setelah 10 percobaan gagal (percobaan ke-${status429})`);
  check(
    (await api('POST', '/api/student/login', { body: { nim: nimTarget, password: 'rahasia123' } })).status === 429,
    'sandi benar pun ikut tertahan selama terkunci',
  );
  // Hitungan per NIM: mahasiswa lain tidak boleh ikut terkena.
  check(
    (await api('POST', '/api/student/login', { body: { nim: nimRina, password: reset.data.password } })).status === 200,
    'mahasiswa lain tidak ikut terkunci',
  );
  // Reset sandi oleh dosen adalah jalan keluarnya kalau mahasiswa benar-benar terkunci.
  const sandiBaru = (await admin('POST', `/api/admin/students/${nimTarget}/reset-password`)).data.password;
  check(
    (await api('POST', '/api/student/login', { body: { nim: nimTarget, password: sandiBaru } })).status === 200,
    'reset oleh dosen membuka kuncian',
  );

  const listDraft = await api('GET', `/api/student/courses/${mobile.slug}`, { student: rina });
  check(listDraft.data.meetings.length === 0, 'pertemuan draft tidak tampil ke mahasiswa');
  const belumGabung = await api('GET', `/api/student/courses/${basdat.slug}`, { student: rina });
  check(belumGabung.status === 403, 'kelas yang belum digabung tidak bisa dibuka');

  console.log('\nLive: Pertemuan 1');
  const teacher = await connect();
  teacher.sendJson({ type: 'teacher:join', meetingId: p1.id, teacherToken: TOKEN, projectName: 'kasir-app' });
  const joined = await teacher.next('teacher:joined');
  check(joined.studentUrl.endsWith(`/mk/${mobile.slug}/p/${p1.id}`), 'dosen bergabung, link mahasiswa benar');
  teacher.sendJson({ type: 'project:snapshot', tree: tree('main.dart', 'menu.dart', 'logo.png') });
  teacher.sendJson({ type: 'file:create', path: 'main.dart', content: 'void main() {}', language: 'dart' });
  teacher.sendJson({ type: 'file:create', path: 'menu.dart', content: 'final menu = [];', language: 'dart' });
  teacher.sendJson({ type: 'asset:metadata', path: 'logo.png' });
  await sleep(100);

  const intruder = await connect();
  intruder.sendJson({ type: 'student:join', meetingId: p1.id, studentToken: budi });
  check((await intruder.next('error')).reason === 'not_enrolled', 'mahasiswa yang belum gabung kelas ditolak');
  intruder.close();

  const anonim = await connect();
  anonim.sendJson({ type: 'student:join', meetingId: p1.id, accessCode: mobile.accessCode, studentName: 'Siapa Saja' });
  check((await anonim.next('error')).reason === 'unauthenticated', 'kode kelas saja tidak cukup untuk masuk sesi');
  anonim.close();

  const student = await connect();
  student.sendJson({ type: 'student:join', meetingId: p1.id, studentToken: rina });
  const init = await student.next('session:init');
  check(init.meeting.status === 'live' && init.tree.length === 3 && init.hasTeacher, 'mahasiswa menerima tree live');

  // Nama di daftar pantau diambil dari akun, bukan dari pesan klien; menyebut
  // nama lain saat bergabung tidak mengubah apa pun yang tercatat.
  const penyamar = await connect();
  penyamar.sendJson({ type: 'student:join', meetingId: p1.id, studentToken: rina, studentName: 'Mahasiswa Hantu' });
  await penyamar.next('session:init');
  const terpantau = (await admin('GET', `/api/admin/meetings/${p1.id}/viewers`)).data.viewers.map((v) => v.name);
  check(!terpantau.includes('Mahasiswa Hantu') && terpantau.includes('Rina Aprilia'), 'nama tidak bisa dipalsukan saat bergabung');
  penyamar.close();

  teacher.sendJson({ type: 'file:update', path: 'main.dart', content: 'void main() { print(1); }', language: 'dart' });
  const update = await student.next('file:update');
  check(update.content.includes('print(1)'), 'perubahan file diterima real-time');

  student.sendJson({ type: 'file:request', path: 'menu.dart' });
  check((await student.next('file:content')).content === 'final menu = [];', 'mahasiswa bisa meminta isi file');

  student.sendJson({ type: 'file:update', path: 'main.dart', content: 'hack' });
  check((await student.next('error')).message.includes('Hanya dosen'), 'mahasiswa tidak bisa mengubah file');

  teacher.sendJson({ type: 'file:update', path: '../etc/passwd', content: 'x' });
  check((await teacher.next('error')).message.includes('tidak aman'), 'path traversal ditolak');

  teacher.sendJson({ type: 'file:update', path: 'big.txt', content: 'x'.repeat(600 * 1024) });
  check((await teacher.next('error')).message.includes('terlalu besar'), 'file terlalu besar ditolak');

  teacher.sendJson({ type: 'teacher:leave' });
  await student.next('teacher:disconnected');
  teacher.close();
  await sleep(100);
  const afterP1 = await api('GET', `/api/student/courses/${mobile.slug}`, { student: rina });
  check(afterP1.data.meetings[0].status === 'finished', 'setelah stop, status pertemuan jadi selesai');

  student.sendJson({ type: 'file:request', path: 'main.dart' });
  check((await student.next('file:content')).content.includes('print(1)'), 'isi file tetap bisa dibuka setelah selesai');
  student.close();

  console.log('\nLanjutan: Pertemuan 2 melanjutkan Pertemuan 1');
  const teacher2 = await connect();
  teacher2.sendJson({ type: 'teacher:join', meetingId: p2.id, teacherToken: TOKEN, projectName: 'kasir-app', continuesFrom: p1.id });
  await teacher2.next('teacher:joined');
  teacher2.sendJson({ type: 'project:snapshot', tree: tree('main.dart', 'menu.dart', 'cart.dart', 'logo.png') });
  teacher2.sendJson({ type: 'file:create', path: 'main.dart', content: 'void main() { print(1); }', language: 'dart' });
  teacher2.sendJson({ type: 'file:create', path: 'menu.dart', content: 'final menu = ["Nasi Goreng"];', language: 'dart' });
  teacher2.sendJson({ type: 'file:create', path: 'cart.dart', content: 'class Cart {}', language: 'dart' });
  teacher2.sendJson({ type: 'asset:metadata', path: 'logo.png' });
  await sleep(100);

  const student2 = await connect();
  student2.sendJson({ type: 'student:join', meetingId: p2.id, studentToken: rina });
  const init2 = await student2.next('session:init');
  check(init2.meeting.continuesFrom?.number === 1, 'label "Lanjutan dari Pertemuan 1" tersedia');
  check(
    init2.changes['menu.dart'] === 'modified' &&
      init2.changes['cart.dart'] === 'new' &&
      !init2.changes['main.dart'] &&
      !init2.changes['logo.png'],
    'badge: menu.dart Diubah, cart.dart Baru, file yang sama tanpa badge',
  );

  teacher2.sendJson({ type: 'file:update', path: 'main.dart', content: 'void main() { print(2); }', language: 'dart' });
  check((await student2.next('file:update')).change === 'modified', 'badge Diubah ikut terkirim saat live');

  const invalidParent = await connect();
  invalidParent.sendJson({ type: 'teacher:join', meetingId: p1.id, teacherToken: TOKEN, continuesFrom: p1.id });
  check((await invalidParent.next('error')).message.includes('tidak valid'), 'pertemuan tidak bisa melanjutkan dirinya sendiri');

  console.log('\nVisibilitas & hapus');
  check((await admin('DELETE', `/api/admin/meetings/${p2.id}`)).status === 409, 'pertemuan yang sedang live tidak bisa dihapus');
  await admin('PATCH', `/api/admin/meetings/${p2.id}`, { visible: false });
  check((await student2.next('meeting:closed')).message.includes('disembunyikan'), 'mahasiswa dikeluarkan saat pertemuan disembunyikan');
  const hiddenList = await api('GET', `/api/student/courses/${mobile.slug}`, { student: rina });
  check(!hiddenList.data.meetings.some((m) => m.id === p2.id), 'pertemuan tersembunyi tidak tampil di daftar');
  const blocked = await connect();
  blocked.sendJson({ type: 'student:join', meetingId: p2.id, studentToken: rina });
  check((await blocked.next('error')).message.includes('belum tersedia'), 'pertemuan tersembunyi tidak bisa dibuka');

  teacher2.close();
  await sleep(100);

  await admin('PATCH', `/api/admin/courses/${mobile.id}`, { codeActive: false });
  check(
    (await api('POST', '/api/student/courses', { student: budi, body: { code: mobile.accessCode } })).status === 404,
    'kode nonaktif tidak bisa dipakai bergabung',
  );
  check(
    (await api('GET', `/api/student/courses/${mobile.slug}`, { student: rina })).status === 200,
    'yang sudah gabung tetap bisa membuka kelas walau kode dimatikan',
  );
  const regenerated = (await admin('POST', `/api/admin/courses/${mobile.id}/regenerate-code`)).data.course;
  check(regenerated.accessCode !== mobile.accessCode, 'kode akses bisa dibuat ulang');

  check((await admin('DELETE', `/api/admin/meetings/${p2.id}`)).status === 204, 'pertemuan bisa dihapus');
  check((await admin('DELETE', `/api/admin/courses/${mobile.id}`)).status === 204, 'mata kuliah uji dihapus');
  check((await admin('DELETE', `/api/admin/courses/${basdat.id}`)).status === 204, 'mata kuliah uji kedua dihapus');
  check((await admin('DELETE', `/api/admin/students/${nimRina}`)).status === 204, 'akun uji dihapus');
  check((await admin('DELETE', `/api/admin/students/${nimBudi}`)).status === 204, 'akun uji kedua dihapus');
  check((await admin('DELETE', `/api/admin/students/${nimTarget}`)).status === 204, 'akun uji ketiga dihapus');
  check((await api('GET', '/api/student/me', { student: rina })).status === 401, 'sesi ikut terhapus bersama akun');

  console.log(`\nSemua ${passed} pengecekan lulus.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
