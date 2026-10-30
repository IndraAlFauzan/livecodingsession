const { send, broadcast } = require('./wsUtils');

const rooms = new Map();

// Pertemuan yang dosennya baru saja putus dan masih ditunggu kembali.
const reconnecting = new Map();

function markReconnecting(meetingId, timer) {
  clearReconnecting(meetingId);
  reconnecting.set(meetingId, timer);
}

function clearReconnecting(meetingId) {
  const timer = reconnecting.get(meetingId);
  if (timer) clearTimeout(timer);
  reconnecting.delete(meetingId);
}

function isReconnecting(meetingId) {
  return reconnecting.has(meetingId);
}

function getRoom(meetingId) {
  if (!rooms.has(meetingId)) rooms.set(meetingId, { teacher: null, students: new Set(), selection: null });
  return rooms.get(meetingId);
}

function releaseRoom(meetingId) {
  const room = rooms.get(meetingId);
  if (room && !room.teacher && room.students.size === 0 && !isReconnecting(meetingId)) rooms.delete(meetingId);
}

function hasTeacher(meetingId) {
  return Boolean(rooms.get(meetingId)?.teacher);
}

function getSelection(meetingId) {
  return rooms.get(meetingId)?.selection ?? null;
}

// Dosen perlu tahu siapa yang menonton; mahasiswa tidak melihat daftar ini.
function sendToTeacher(meetingId, payload) {
  const teacher = rooms.get(meetingId)?.teacher;
  if (teacher) send(teacher, payload);
}

function listViewers(meetingId) {
  const room = rooms.get(meetingId);
  if (!room) return [];
  // Nama dan NIM berasal dari akun: join ditolak tanpa tanda sesi yang sah,
  // jadi keduanya selalu terisi dan tidak butuh nilai cadangan.
  return [...room.students].map((student) => ({
    id: student.viewerId,
    nim: student.studentNim,
    name: student.studentName,
    file: student.viewingFile || null,
    following: student.following !== false,
  }));
}

function pushViewers(meetingId) {
  const viewers = listViewers(meetingId);
  sendToTeacher(meetingId, { type: 'room:viewers', total: viewers.length, viewers });
}

function broadcastToStudents(meetingId, payload) {
  const room = rooms.get(meetingId);
  if (room) broadcast(room.students, payload);
}

function kickStudents(meetingId, message) {
  const room = rooms.get(meetingId);
  if (!room) return;
  for (const student of room.students) {
    send(student, { type: 'meeting:closed', message });
    student.close(4003, 'Meeting closed');
  }
}

module.exports = {
  getRoom,
  releaseRoom,
  hasTeacher,
  getSelection,
  broadcastToStudents,
  kickStudents,
  sendToTeacher,
  listViewers,
  pushViewers,
  markReconnecting,
  clearReconnecting,
  isReconnecting,
};
