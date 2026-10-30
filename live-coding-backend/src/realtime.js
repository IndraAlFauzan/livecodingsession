const WebSocket = require('ws');

const { config } = require('./config');
const db = require('./db');
const live = require('./live');
const { isTeacherToken } = require('./auth');
const { isSafeRelativePath, isValidMessage } = require('./validation');
const { send, parseMessage } = require('./wsUtils');

// Seluruh protokol WebSocket satu tempat: dosen menyiarkan, mahasiswa menonton.
function attachRealtime(server) {
  const wss = new WebSocket.Server({ server, maxPayload: 8 * 1024 * 1024 });

  function studentUrl(course, meetingId) {
    return `${config.publicBaseUrl}/mk/${course.slug}/p/${meetingId}`;
  }

  function buildInit(meetingId) {
    const meeting = db.getMeeting(meetingId);
    const course = db.getCourseById(meeting.courseId);
    return {
      type: 'session:init',
      course: { slug: course.slug, name: course.name },
      meeting: {
        id: meeting.id,
        number: meeting.number,
        title: meeting.title,
        status: meeting.status,
        projectName: meeting.projectName,
        continuesFrom: meeting.continuesFrom,
        startedAt: meeting.startedAt,
      },
      tree: db.getMeetingTree(meetingId),
      activeFile: meeting.activeFile,
      changes: db.getChanges(meetingId),
      hasTeacher: live.hasTeacher(meetingId),
      selection: live.getSelection(meetingId),
    };
  }

  function reject(ws, message, reason = 'rejected') {
    send(ws, { type: 'error', message, reason });
    ws.close(4003, 'Rejected');
  }

  function isActiveTeacher(ws) {
    return ws.role === 'teacher' && ws.meetingId && live.getRoom(ws.meetingId).teacher === ws;
  }

  function endMeetingNow(meetingId) {
    live.clearReconnecting(meetingId);
    db.finishMeeting(meetingId);
    live.broadcastToStudents(meetingId, { type: 'teacher:disconnected' });
    live.releaseRoom(meetingId);
  }

  // Dosen pamit lewat 'teacher:leave' = sesi berakhir saat itu juga. Koneksi yang
  // putus sendiri belum tentu berarti kelas usai -- WiFi kampus kadang hilang
  // sebentar -- jadi pertemuan ditahan tetap live selama masa tenggang. Kalau
  // dosen kembali sebelum habis, sesi yang sama dilanjutkan: jam dan file utuh.
  function releaseTeacher(ws, { immediate = false } = {}) {
    if (!isActiveTeacher(ws)) return;
    const meetingId = ws.meetingId;
    const room = live.getRoom(meetingId);
    room.teacher = null;
    room.selection = null;

    if (immediate || config.teacherGraceMs <= 0) return endMeetingNow(meetingId);

    live.broadcastToStudents(meetingId, { type: 'teacher:waiting', graceMs: config.teacherGraceMs });
    const timer = setTimeout(() => endMeetingNow(meetingId), config.teacherGraceMs);
    if (timer.unref) timer.unref();
    live.markReconnecting(meetingId, timer);
  }

  // ---------- handlers ----------

  function handleTeacherJoin(ws, message) {
    if (!isTeacherToken(message.teacherToken)) return reject(ws, 'Token dosen tidak valid.');

    const meeting = typeof message.meetingId === 'string' ? db.getMeeting(message.meetingId) : null;
    if (!meeting) return reject(ws, 'Pertemuan tidak ditemukan.');

    const room = live.getRoom(meeting.id);
    if (room.teacher && room.teacher !== ws) {
      return reject(ws, 'Pertemuan ini sedang dibuka dari VS Code lain.');
    }

    let continuesFrom = null;
    if (message.continuesFrom) {
      const parent = db.getMeeting(message.continuesFrom);
      if (!parent || parent.courseId !== meeting.courseId || parent.id === meeting.id) {
        return reject(ws, 'Pertemuan yang dilanjutkan tidak valid.');
      }
      continuesFrom = parent.id;
    }

    const projectName =
      typeof message.projectName === 'string' && message.projectName.trim()
        ? message.projectName.trim().slice(0, 200)
        : 'Untitled Project';

    // Sambung lagi di dalam masa tenggang melanjutkan sesi yang sama; kalau tidak,
    // ini sesi baru dan db.startMeeting mengosongkan file serta mengulang jamnya.
    const resuming = live.isReconnecting(meeting.id) && meeting.status === 'live';
    if (resuming) live.clearReconnecting(meeting.id);
    else db.startMeeting(meeting.id, { projectName, continuesFrom });

    room.teacher = ws;
    ws.role = 'teacher';
    ws.meetingId = meeting.id;

    const course = db.getCourseById(meeting.courseId);
    send(ws, {
      type: 'teacher:joined',
      meetingId: meeting.id,
      studentUrl: studentUrl(course, meeting.id),
      courseName: course.name,
      accessCode: course.accessCode,
    });

    live.broadcastToStudents(meeting.id, buildInit(meeting.id));
    live.pushViewers(meeting.id);
  }

  let viewerSeq = 0;

  function handleStudentJoin(ws, message) {
    const meeting = typeof message.meetingId === 'string' ? db.getMeeting(message.meetingId) : null;

    // Dosen boleh menengok halaman mahasiswa untuk memeriksa apa yang mereka
    // lihat. Jalurnya dipisah dari jalur mahasiswa supaya tidak ada akun palsu
    // bernama "Dosen" yang ikut tercatat sebagai penonton.
    const pratinjau = isTeacherToken(message.teacherToken);

    // Identitas datang dari tanda sesi, bukan dari badan pesan. Klien tidak lagi
    // bisa menyebut nama sendiri, jadi tidak ada cara menyamar jadi orang lain.
    const akun = pratinjau ? null : db.getStudentBySession(message.studentToken);
    if (!pratinjau && !akun) {
      return reject(ws, 'Sesi kamu sudah berakhir. Masuk lagi lalu buka pertemuan ini.', 'unauthenticated');
    }

    if (!meeting) return reject(ws, 'Pertemuan tidak ditemukan.', 'invalid_code');
    if (!pratinjau && !db.isEnrolled(meeting.courseId, akun.id)) {
      return reject(ws, 'Kamu belum bergabung di mata kuliah ini.', 'not_enrolled');
    }
    // Dosen boleh menengok pertemuan yang masih draft atau disembunyikan --
    // justru itu gunanya memeriksa sebelum dibuka ke mahasiswa.
    if (!pratinjau && (!meeting.visible || meeting.status === 'draft')) {
      return reject(ws, 'Pertemuan ini belum tersedia.', 'unavailable');
    }

    live.getRoom(meeting.id).students.add(ws);
    ws.role = 'student';
    ws.meetingId = meeting.id;
    ws.preview = pratinjau;
    ws.viewerId = `v${++viewerSeq}`;
    ws.viewingFile = null;
    ws.following = true;

    if (pratinjau) {
      // Tidak dicatat dan tidak dihitung: dosen sedang melihat layarnya sendiri,
      // bukan menghadiri kelasnya sendiri.
      send(ws, buildInit(meeting.id));
      return;
    }

    ws.studentId = akun.id;
    ws.studentNim = akun.nim;
    ws.studentName = akun.name;

    // Daftar "siapa yang pernah membuka pertemuan ini" tetap seperti sebelumnya;
    // bedanya namanya kini berasal dari akun, bukan dari kiriman klien.
    db.recordViewer(meeting.id, akun.name);
    send(ws, buildInit(meeting.id));
    live.pushViewers(meeting.id);
  }

  // Mahasiswa melaporkan file yang sedang dibuka supaya dosen tahu siapa tertinggal di mana.
  function handleStudentView(ws, message) {
    if (ws.role !== 'student' || !ws.meetingId) return;
    ws.viewingFile = typeof message.path === 'string' ? message.path : null;
    ws.following = message.following !== false;
    live.pushViewers(ws.meetingId);
  }

  function handleTree(ws, message) {
    const tree = Array.isArray(message.tree) ? message.tree : [];
    db.setMeetingTree(ws.meetingId, tree);
    live.broadcastToStudents(ws.meetingId, { type: 'tree:update', tree });
  }

  function handleTextFile(ws, message) {
    if (typeof message.content !== 'string') {
      return send(ws, { type: 'error', message: 'Isi file harus berupa teks.', path: message.path });
    }
    if (Buffer.byteLength(message.content, 'utf8') > config.maxFileSizeBytes) {
      return send(ws, {
        type: 'error',
        message: `File terlalu besar. Maksimal ${config.maxFileSizeBytes} byte.`,
        path: message.path,
      });
    }

    const file = {
      path: message.path,
      kind: 'text',
      content: message.content,
      language: typeof message.language === 'string' ? message.language : 'plaintext',
      updatedAt: message.updatedAt || new Date().toISOString(),
    };
    const change = db.upsertFile(ws.meetingId, file);

    live.broadcastToStudents(ws.meetingId, {
      type: message.type,
      path: file.path,
      content: file.content,
      language: file.language,
      updatedAt: file.updatedAt,
      change,
    });
  }

  function handleAsset(ws, message) {
    const updatedAt = message.updatedAt || new Date().toISOString();
    const change = db.upsertFile(ws.meetingId, { path: message.path, kind: 'asset', updatedAt });
    live.broadcastToStudents(ws.meetingId, {
      type: 'asset:metadata',
      path: message.path,
      assetType: 'binary',
      updatedAt,
      change,
    });
  }

  function handleFileDelete(ws, message) {
    db.deleteFile(ws.meetingId, message.path);
    live.broadcastToStudents(ws.meetingId, { type: 'file:delete', path: message.path });
  }

  function handleActiveFile(ws, message) {
    db.setActiveFile(ws.meetingId, message.path);
    live.broadcastToStudents(ws.meetingId, { type: 'teacher:active-file', path: message.path });
  }

  const MAX_SELECTIONS = 20;

  function isLineOrColumn(value) {
    return Number.isInteger(value) && value >= 1 && value <= 1_000_000;
  }

  // Seleksi hanya disimpan di memori: tidak relevan untuk arsip pertemuan.
  function handleSelection(ws, message) {
    const selections = (Array.isArray(message.selections) ? message.selections : [])
      .slice(0, MAX_SELECTIONS)
      .filter((s) => s && [s.startLine, s.startColumn, s.endLine, s.endColumn].every(isLineOrColumn))
      .map(({ startLine, startColumn, endLine, endColumn }) => ({ startLine, startColumn, endLine, endColumn }));

    live.getRoom(ws.meetingId).selection = selections.length ? { path: message.path, selections } : null;
    live.broadcastToStudents(ws.meetingId, { type: 'teacher:selection', path: message.path, selections });
  }

  function handleFileRequest(ws, message) {
    const file = db.getFile(ws.meetingId, message.path);
    if (!file) return send(ws, { type: 'file:not-found', path: message.path });

    if (file.kind === 'asset') {
      return send(ws, { type: 'asset:content', path: message.path, assetType: 'binary', updatedAt: file.updatedAt });
    }
    send(ws, {
      type: 'file:content',
      path: message.path,
      content: file.content,
      language: file.language,
      updatedAt: file.updatedAt,
    });
  }

  const teacherHandlers = {
    'project:snapshot': handleTree,
    'tree:update': handleTree,
    'file:create': handleTextFile,
    'file:update': handleTextFile,
    'asset:metadata': handleAsset,
    'file:delete': handleFileDelete,
    'teacher:active-file': handleActiveFile,
    'teacher:selection': handleSelection,
    'teacher:leave': (ws) => releaseTeacher(ws, { immediate: true }),
    // Folder kosong muncul lewat tree:update yang dikirim extension setelahnya.
    'folder:create': () => {},
  };

  const eventsWithPath = new Set([
    'file:create',
    'file:update',
    'asset:metadata',
    'file:delete',
    'teacher:active-file',
    'teacher:selection',
    'file:request',
  ]);

  // Koneksi yang hilang tanpa penutupan rapi -- laptop dosen tidur, WiFi putus,
  // kabel dicabut -- tidak pernah memicu 'close', jadi pertemuan akan terkunci
  // sebagai live selamanya. Ping berkala menutup celah itu: socket yang tidak
  // membalas pong dalam satu putaran diputus, dan 'close' membereskan room-nya.
  function markAlive() {
    this.isAlive = true;
  }

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, config.wsHeartbeatMs);

  wss.on('close', () => clearInterval(heartbeat));

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', markAlive);
    send(ws, { type: 'connected', message: 'Connected to Live Coding backend.' });

    ws.on('message', (raw) => {
      const message = parseMessage(raw);
      if (!isValidMessage(message)) {
        return send(ws, { type: 'error', message: 'Pesan JSON tidak valid.' });
      }

      const { type } = message;

      if (type === 'teacher:join') return handleTeacherJoin(ws, message);
      if (type === 'student:join') return handleStudentJoin(ws, message);

      if (!ws.meetingId) {
        return send(ws, { type: 'error', message: 'Belum bergabung ke pertemuan.' });
      }

      if (eventsWithPath.has(type) && !isSafeRelativePath(message.path)) {
        return send(ws, { type: 'error', message: 'Path file tidak aman, ditolak.' });
      }

      if (type === 'file:request') return handleFileRequest(ws, message);
      if (type === 'student:view') return handleStudentView(ws, message);

      const handler = teacherHandlers[type];
      if (!handler) {
        return send(ws, { type: 'error', message: `Event tidak dikenal: ${type}` });
      }
      if (!isActiveTeacher(ws)) {
        return send(ws, { type: 'error', message: 'Hanya dosen yang boleh mengirim event ini.' });
      }

      try {
        handler(ws, message);
      } catch (error) {
        console.error(`Gagal memproses ${type}:`, error);
        send(ws, { type: 'error', message: `Gagal memproses ${type}.` });
      }
    });

    ws.on('close', () => {
      if (!ws.meetingId) return;
      releaseTeacher(ws);
      if (ws.role === 'student') {
        live.getRoom(ws.meetingId).students.delete(ws);
        live.pushViewers(ws.meetingId);
      }
      live.releaseRoom(ws.meetingId);
    });
  });

  return wss;
}

module.exports = { attachRealtime };
