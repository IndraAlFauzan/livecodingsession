function isSafeRelativePath(path) {
  if (typeof path !== 'string' || path.trim() === '') return false;
  if (path.includes('\0')) return false;
  if (path.startsWith('/')) return false;
  if (/^[a-zA-Z]:[\\/]/.test(path)) return false;

  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');

  return !parts.some((part) => part === '..');
}

function isValidMessage(raw) {
  return raw && typeof raw === 'object' && typeof raw.type === 'string';
}

module.exports = {
  isSafeRelativePath,
  isValidMessage,
};
