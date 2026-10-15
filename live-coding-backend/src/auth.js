const crypto = require('crypto');
const { config } = require('./config');

function isTeacherToken(token) {
  if (typeof token !== 'string') return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(config.teacherToken);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function requireTeacherToken(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!isTeacherToken(token)) {
    return res.status(401).json({ error: 'Token dosen tidak valid.' });
  }
  next();
}

module.exports = { isTeacherToken, requireTeacherToken };
