const { send, broadcast } = require('./wsUtils');

const rooms = new Map();

function getRoom(meetingId) {
  if (!rooms.has(meetingId)) rooms.set(meetingId, { teacher: null, students: new Set(), selection: null });
  return rooms.get(meetingId);
}

function releaseRoom(meetingId) {
  const room = rooms.get(meetingId);
  if (room && !room.teacher && room.students.size === 0) rooms.delete(meetingId);
}

function hasTeacher(meetingId) {
  return Boolean(rooms.get(meetingId)?.teacher);
}

function getSelection(meetingId) {
  return rooms.get(meetingId)?.selection ?? null;
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

module.exports = { getRoom, releaseRoom, hasTeacher, getSelection, broadcastToStudents, kickStudents };
