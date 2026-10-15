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

async function api(method, path, { body, token, code } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (code) headers['x-access-code'] = code;
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

  console.log('\nAkses mahasiswa');
  const access = await api('POST', '/api/student/access', { body: { code: mobile.accessCode.toLowerCase() } });
  check(access.status === 200 && access.data.course.slug === mobile.slug, 'kode akses benar (tidak case-sensitive)');
  check((await api('POST', '/api/student/access', { body: { code: 'SALAH-123' } })).status === 404, 'kode salah ditolak');
  const listDraft = await api('GET', `/api/student/courses/${mobile.slug}`, { code: mobile.accessCode });
  check(listDraft.data.meetings.length === 0, 'pertemuan draft tidak tampil ke mahasiswa');
  const crossCode = await api('GET', `/api/student/courses/${mobile.slug}`, { code: basdat.accessCode });
  check(crossCode.status === 403, 'kode mata kuliah lain tidak bisa membuka mata kuliah ini');

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
  intruder.sendJson({ type: 'student:join', meetingId: p1.id, accessCode: basdat.accessCode });
  check((await intruder.next('error')).message.includes('Kode akses'), 'mahasiswa dengan kode lain ditolak');

  const student = await connect();
  student.sendJson({ type: 'student:join', meetingId: p1.id, accessCode: mobile.accessCode });
  const init = await student.next('session:init');
  check(init.meeting.status === 'live' && init.tree.length === 3 && init.hasTeacher, 'mahasiswa menerima tree live');

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
  const afterP1 = await api('GET', `/api/student/courses/${mobile.slug}`, { code: mobile.accessCode });
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
  student2.sendJson({ type: 'student:join', meetingId: p2.id, accessCode: mobile.accessCode });
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
  const hiddenList = await api('GET', `/api/student/courses/${mobile.slug}`, { code: mobile.accessCode });
  check(!hiddenList.data.meetings.some((m) => m.id === p2.id), 'pertemuan tersembunyi tidak tampil di daftar');
  const blocked = await connect();
  blocked.sendJson({ type: 'student:join', meetingId: p2.id, accessCode: mobile.accessCode });
  check((await blocked.next('error')).message.includes('belum tersedia'), 'pertemuan tersembunyi tidak bisa dibuka');

  teacher2.close();
  await sleep(100);

  await admin('PATCH', `/api/admin/courses/${mobile.id}`, { codeActive: false });
  check((await api('POST', '/api/student/access', { body: { code: mobile.accessCode } })).status === 404, 'kode nonaktif ditolak');
  const regenerated = (await admin('POST', `/api/admin/courses/${mobile.id}/regenerate-code`)).data.course;
  check(regenerated.accessCode !== mobile.accessCode, 'kode akses bisa dibuat ulang');

  check((await admin('DELETE', `/api/admin/meetings/${p2.id}`)).status === 204, 'pertemuan bisa dihapus');
  check((await admin('DELETE', `/api/admin/courses/${mobile.id}`)).status === 204, 'mata kuliah uji dihapus');
  check((await admin('DELETE', `/api/admin/courses/${basdat.id}`)).status === 204, 'mata kuliah uji kedua dihapus');

  console.log(`\nSemua ${passed} pengecekan lulus.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
