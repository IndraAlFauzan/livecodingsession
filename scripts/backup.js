#!/usr/bin/env node
// Mencadangkan database jadi SATU berkas konsisten, aman dijalankan selagi
// server hidup.
//
//   node scripts/backup.js [folder-tujuan]
//
// Kenapa bukan `cp livecoding.db`: database memakai mode WAL, jadi perubahan
// terbaru -- bahkan tabel yang baru dibuat -- bisa masih berada di berkas -wal
// dan belum masuk ke .db. Menyalin .db saja menghasilkan cadangan yang
// diam-diam tertinggal. VACUUM INTO menulis snapshot utuh ke satu berkas.

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const akar = path.join(__dirname, "..");
const sumber = process.env.DB_PATH || path.join(akar, "live-coding-backend/data/livecoding.db");
const tujuan = path.resolve(process.argv[2] || path.join(akar, "backups"));

if (!fs.existsSync(sumber)) {
  console.error(`Database tidak ditemukan: ${sumber}`);
  process.exit(1);
}
fs.mkdirSync(tujuan, { recursive: true });

const cap = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const hasil = path.join(tujuan, `livecoding-${cap}.db`);

const db = new DatabaseSync(sumber, { readOnly: true });
// SQLite memakai kutip tunggal untuk literal teks; kutip di dalam digandakan.
db.exec(`VACUUM INTO '${hasil.replace(/'/g, "''")}'`);
db.close();

const salinan = new DatabaseSync(hasil, { readOnly: true });
const versi = salinan.prepare("PRAGMA user_version").get().user_version;
const baris = ["courses", "meetings", "meeting_files", "meeting_viewers", "blobs"]
  .map((t) => `${t} ${salinan.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c}`)
  .join(" · ");
salinan.close();

const kb = (fs.statSync(hasil).size / 1024).toFixed(0);
console.log(`Cadangan dibuat: ${hasil}`);
console.log(`  ${kb} KB · skema versi ${versi} · ${baris}`);
