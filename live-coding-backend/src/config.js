require('dotenv').config();
const path = require('path');

const config = {
  port: Number(process.env.PORT || 3000),
  teacherToken: process.env.TEACHER_TOKEN || 'change-this-secret-token',
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://localhost:5174').replace(/\/$/, ''),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES || 524288),
  wsHeartbeatMs: Number(process.env.WS_HEARTBEAT_MS || 30000),
  teacherGraceMs: Number(process.env.TEACHER_GRACE_MS || 120000),
  dbPath: path.resolve(process.env.DB_PATH || path.join(__dirname, '..', 'data', 'livecoding.db')),
};

module.exports = { config };
