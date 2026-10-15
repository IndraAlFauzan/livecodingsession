const sessions = new Map();

function createEmptySession(sessionId) {
  return {
    id: sessionId,
    projectName: 'Untitled Project',
    tree: [],
    files: new Map(),
    activeFile: null,
    teacher: null,
    students: new Set(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, createEmptySession(sessionId));
  }
  return sessions.get(sessionId);
}

function listSessions() {
  return Array.from(sessions.values()).map((session) => ({
    id: session.id,
    projectName: session.projectName,
    activeFile: session.activeFile,
    studentCount: session.students.size,
    hasTeacher: Boolean(session.teacher),
    fileCount: session.files.size,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }));
}

function touchSession(session) {
  session.updatedAt = new Date().toISOString();
}

function removeStudent(session, ws) {
  session.students.delete(ws);
}

function cleanupSessionIfEmpty(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (!session.teacher && session.students.size === 0) {
    sessions.delete(sessionId);
  }
}

module.exports = {
  getSession,
  listSessions,
  touchSession,
  removeStudent,
  cleanupSessionIfEmpty,
};
