const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'migrations');

// Versi skema disimpan di dalam berkas database itu sendiri lewat PRAGMA
// user_version -- fitur bawaan SQLite, tidak perlu tabel atau pustaka tambahan.
function readVersion(db) {
  return db.prepare('PRAGMA user_version').get().user_version;
}

function writeVersion(db, version) {
  // PRAGMA tidak menerima parameter terikat, jadi angkanya dipastikan integer dulu.
  db.exec(`PRAGMA user_version = ${Number.parseInt(version, 10)}`);
}

function listMigrations() {
  return fs
    .readdirSync(DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => {
      const version = Number.parseInt(name.slice(0, 3), 10);
      if (!Number.isInteger(version) || version < 1) {
        throw new Error(`Nama migrasi harus diawali nomor tiga digit: ${name}`);
      }
      return { version, name, sql: fs.readFileSync(path.join(DIR, name), 'utf8') };
    });
}

// Database yang dibuat sebelum sistem migrasi ada punya user_version 0 padahal
// isinya sudah setara migrasi 001. Menjalankan 001 di atasnya tidak merusak
// (semuanya IF NOT EXISTS), tapi menandainya lebih jujur: versi mencerminkan
// bentuk yang sebenarnya, dan migrasi berikutnya tetap jalan seperti biasa.
function baseline(db) {
  const adaTabelLama = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'courses'")
    .get();
  if (adaTabelLama) {
    writeVersion(db, 1);
    return 1;
  }
  return 0;
}

function migrate(db, { log = console.log } = {}) {
  const migrations = listMigrations();
  if (migrations.length === 0) throw new Error('Tidak ada berkas migrasi.');

  let current = readVersion(db);
  if (current === 0) current = baseline(db);

  const tertunda = migrations.filter((m) => m.version > current);
  if (tertunda.length === 0) return { from: current, to: current, applied: [] };

  const applied = [];
  for (const m of tertunda) {
    // Satu migrasi = satu transaksi. Gagal di tengah berarti tidak ada yang
    // berubah, bukan skema setengah jadi yang sulit dipulihkan.
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      writeVersion(db, m.version);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migrasi ${m.name} gagal: ${error.message}`);
    }
    applied.push(m.name);
    log(`  migrasi ${m.name} diterapkan`);
  }

  return { from: current, to: readVersion(db), applied };
}

module.exports = { migrate, readVersion, listMigrations };
