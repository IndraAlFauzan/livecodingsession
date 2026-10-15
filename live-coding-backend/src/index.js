const express = require('express');
const http = require('http');
const cors = require('cors');
const WebSocket = require('ws');

const { config } = require('./config');
const db = require('./db');
const live = require('./live');
const routes = require('./routes');
const { isTeacherToken } = require('./auth');
const { isSafeRelativePath, isValidMessage } = require('./validation');
const { send, parseMessage } = require('./wsUtils');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, maxPayload: 8 * 1024 * 1024 });

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'live-coding-backend' });
});

app.use('/api/admin', routes.admin);
app.use('/api/student', routes.student);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Terjadi kesalahan di server.' });
});

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
    },
    tree: db.getMeetingTree(meetingId),
    activeFile: meeting.activeFile,
    changes: db.getChanges(meetingId),
    hasTeacher: live.hasTeacher(meetingId),
  };
}

function reject(ws, message, reason = 'rejected') {
  send(ws, { type: 'error', message, reason });
  ws.close(4003, 'Rejected');
}

function isActiveTeacher(ws) {
  return ws.role === 'teacher' && ws.meetingId && live.getRoom(ws.meetingId).teacher === ws;
}

function releaseTeacher(ws) {
  if (!isActiveTeacher(ws)) return;
  const meetingId = ws.meetingId;
  live.getRoom(meetingId).teacher = null;
  db.finishMeeting(meetingId);
  live.broadcastToStudents(meetingId, { type: 'teacher:disconnected' });
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

  db.startMeeting(meeting.id, { projectName, continuesFrom });
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
}

function handleStudentJoin(ws, message) {
  const meeting = typeof message.meetingId === 'string' ? db.getMeeting(message.meetingId) : null;
  const course = db.getCourseByActiveCode(message.accessCode);

  if (!meeting || !course || course.id !== meeting.courseId) {
    return reject(ws, 'Kode akses tidak valid untuk pertemuan ini.', 'invalid_code');
  }
  if (!meeting.visible || meeting.status === 'draft') {
    return reject(ws, 'Pertemuan ini belum tersedia.', 'unavailable');
  }

  live.getRoom(meeting.id).students.add(ws);
  ws.role = 'student';
  ws.meetingId = meeting.id;

  send(ws, buildInit(meeting.id));
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
  'teacher:leave': (ws) => releaseTeacher(ws),
  // Folder kosong muncul lewat tree:update yang dikirim extension setelahnya.
  'folder:create': () => {},
};

const eventsWithPath = new Set([
  'file:create',
  'file:update',
  'asset:metadata',
  'file:delete',
  'teacher:active-file',
  'file:request',
]);

wss.on('connection', (ws) => {
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
    if (ws.role === 'student') live.getRoom(ws.meetingId).students.delete(ws);
    live.releaseRoom(ws.meetingId);
  });
});

server.listen(config.port, () => {
  console.log(`Live Coding backend running on http://localhost:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
});
