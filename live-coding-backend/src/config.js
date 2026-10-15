require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3000),
  teacherToken: process.env.TEACHER_TOKEN || 'change-this-secret-token',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES || 524288),
};

module.exports = { config };
