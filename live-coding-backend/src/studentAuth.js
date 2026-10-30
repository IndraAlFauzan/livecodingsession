const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

// scrypt bawaan Node, versi async. Yang sinkron memblokir event loop ~20 ms per
// panggilan; satu kelas yang login bersamaan akan menyendatkan sesi live.
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [skema, saltB64, keyB64] = stored.split('$');
  if (skema !== 'scrypt' || !saltB64 || !keyB64) return false;

  const tersimpan = Buffer.from(keyB64, 'base64url');
  const dihitung = await scrypt(password, Buffer.from(saltB64, 'base64url'), tersimpan.length);
  // Perbandingan waktu-tetap: lama pembandingan tidak membocorkan isi hash.
  return crypto.timingSafeEqual(tersimpan, dihitung);
}

// Dibacakan dosen ke mahasiswa, jadi hindari huruf dan angka yang mirip
// (0/O, 1/l/I) supaya tidak salah dengar atau salah ketik.
const HURUF = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function tempPassword() {
  const acak = crypto.randomBytes(12);
  let hasil = '';
  for (let i = 0; i < 12; i++) hasil += HURUF[acak[i] % HURUF.length];
  return `${hasil.slice(0, 4)}-${hasil.slice(4, 8)}-${hasil.slice(8)}`;
}

function newSessionToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// NIM dipakai sebagai nama pengguna, jadi bentuknya dibatasi supaya tidak ada
// spasi tersembunyi atau karakter yang menyulitkan pencarian.
function cleanNim(value) {
  if (typeof value !== 'string') return null;
  const nim = value.trim().toUpperCase();
  return /^[A-Z0-9]{5,20}$/.test(nim) ? nim : null;
}

function checkPassword(value) {
  if (typeof value !== 'string' || value.length < 8) {
    return 'Kata sandi minimal 8 karakter.';
  }
  if (value.length > 200) return 'Kata sandi terlalu panjang.';
  return null;
}

module.exports = { hashPassword, verifyPassword, newSessionToken, tempPassword, cleanNim, checkPassword };
