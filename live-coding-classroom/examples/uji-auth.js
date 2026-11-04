// Menguji dist/auth.js dengan modul "vscode" palsu. Yang paling penting:
// perpindahan dari settings.json ke SecretStorage, karena jalur itu hanya
// terjadi sekali di komputer tiap dosen dan tidak terlihat dari luar.
const Module = require("module");
const path = require("path");

const BACKEND = process.env.BACKEND_WS || "ws://127.0.0.1:4411";
let setelan = { backendUrl: BACKEND };
const rahasia = new Map();
const pesan = [];

const vscodePalsu = {
  workspace: {
    getConfiguration: () => ({
      get: (k, d) => (k in setelan ? setelan[k] : d),
      update: async (k, v) => { setelan[k] = v; },
    }),
    workspaceFolders: [],
  },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
  window: {
    showErrorMessage: (m) => pesan.push("galat: " + m),
    showInformationMessage: (m) => pesan.push("info: " + m),
    showQuickPick: async () => vscodePalsu.__pilih,
    showInputBox: async (opsi) => {
      const nilai = vscodePalsu.__isian.shift();
      if (nilai !== undefined && opsi?.validateInput) {
        const keluhan = await opsi.validateInput(nilai);
        if (keluhan) { vscodePalsu.__keluhan = keluhan; return undefined; }
      }
      return nilai;
    },
  },
  EventEmitter: class {
    constructor() { this.event = () => ({ dispose() {} }); }
    fire() {}
  },
  __pilih: null,
  __isian: [],
};

const asli = Module._load;
Module._load = function (req, ...sisa) {
  if (req === "vscode") return vscodePalsu;
  return asli.call(this, req, ...sisa);
};

const auth = require(path.join(__dirname, "..", "dist", "auth.js"));

let lulus = 0, gagal = 0;
const cek = (n, b, i = "") => { console.log(`  ${b ? "ok  " : "GAGAL"} ${n}${i ? "  -> " + i : ""}`); b ? lulus++ : gagal++; };

auth.initAuth({ secrets: {
  get: async (k) => rahasia.get(k),
  store: async (k, v) => { rahasia.set(k, v); },
  delete: async (k) => { rahasia.delete(k); },
}});

const HTTP = BACKEND.replace(/^ws/, "http");
const TOKEN_ADMIN = process.env.TEACHER_TOKEN || "dev-secret-token";
const PENGGUNA = `uji-ext-${Math.floor(Math.random() * 99999)}`;
const KODE = `UX${Math.floor(Math.random() * 9999)}`;
let sandiAwal = "";

(async () => {
  // Akun dosen disiapkan lewat API admin, supaya tesnya berdiri sendiri.
  const buat = await fetch(`${HTTP}/api/admin/teachers`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN_ADMIN}` },
    body: JSON.stringify({ username: PENGGUNA, code: KODE, name: "Dosen Uji Extension" }),
  });
  if (!buat.ok) {
    console.error(`Tidak bisa menyiapkan akun dosen (${buat.status}). Backend jalan di ${HTTP}?`);
    process.exit(1);
  }
  const dibuat = await buat.json();
  sandiAwal = dibuat.password;

  console.log("1) Tanpa apa pun");
  cek("tidak ada kredensial", (await auth.getCredential()) === undefined);
  cek("label: belum masuk", auth.labelIdentitas() === "belum masuk", auth.labelIdentitas());

  console.log("\n2) Dosen lama: token masih di settings.json");
  setelan.teacherToken = "token-lama-dari-setting";
  cek("setting lama tetap terbaca", (await auth.getCredential()) === "token-lama-dari-setting");

  console.log("\n3) Masuk sebagai dosen");
  vscodePalsu.__pilih = { id: "dosen" };
  vscodePalsu.__isian = [PENGGUNA, sandiAwal];
  const berhasil = await auth.login();
  cek("login berhasil", berhasil === true, pesan[pesan.length - 1]);
  const tersimpan = await auth.getCredential();
  cek("tersimpan di SecretStorage", rahasia.size === 1 && tersimpan !== "token-lama-dari-setting");
  cek("setting lama TIDAK lagi dipakai", tersimpan === rahasia.get("liveCoding.credential"));
  cek("label jadi identitas dosen", auth.labelIdentitas() === `${KODE} · Dosen Uji Extension`, auth.labelIdentitas());

  console.log("\n4) Identitas diperiksa ulang ke server");
  auth.setIdentitas(null);
  await auth.refreshIdentitas();
  cek("identitas pulih dari /check", auth.labelIdentitas() === `${KODE} · Dosen Uji Extension`, auth.labelIdentitas());

  console.log("\n5) Keluar");
  await auth.logout();
  cek("rahasia dihapus", rahasia.size === 0);
  cek("label kembali belum masuk", auth.labelIdentitas() === "belum masuk");
  // Setelah keluar, setting lama kembali jadi cadangan -- itu memang disengaja
  // supaya dosen lama tidak mendadak terkunci.
  cek("setting lama jadi cadangan lagi", (await auth.getCredential()) === "token-lama-dari-setting");

  console.log("\n6) Masuk sebagai admin kampus");
  setelan = { backendUrl: BACKEND };
  vscodePalsu.__pilih = { id: "admin" };
  vscodePalsu.__isian = [TOKEN_ADMIN];
  await auth.login();
  await auth.refreshIdentitas();
  cek("label: Admin kampus", auth.labelIdentitas() === "Admin kampus", auth.labelIdentitas());

  console.log("\n7) Sandi salah");
  await auth.logout();
  vscodePalsu.__pilih = { id: "dosen" };
  vscodePalsu.__isian = [PENGGUNA, "salah-sekali"];
  const gagalLogin = await auth.login();
  cek("ditolak", gagalLogin === false);
  cek("tidak menyimpan apa pun", rahasia.size === 0);
  cek("pesannya dari server", /salah/i.test(pesan[pesan.length - 1]), pesan[pesan.length - 1]);

  // Bersih-bersih: akun uji dibuang lagi.
  await fetch(`${HTTP}/api/admin/teachers/${dibuat.teacher.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN_ADMIN}` },
    body: JSON.stringify({ active: false }),
  });

  console.log("\n8) Alamat server ditanyakan kalau masih bawaan");
  await auth.logout();
  setelan = { backendUrl: "ws://localhost:3000" };
  vscodePalsu.__pilih = { id: "admin" };
  // Dosen menyalin alamat halaman admin yang berawalan https; harus diterima.
  vscodePalsu.__isian = ["https://api.kampus.test/", TOKEN_ADMIN];
  await auth.login();
  cek("https:// diubah jadi wss://", setelan.backendUrl === "wss://api.kampus.test", setelan.backendUrl);

  console.log("\n9) Alamat tidak valid ditolak");
  await auth.logout();
  setelan = { backendUrl: "ws://localhost:3000" };
  vscodePalsu.__keluhan = null;
  vscodePalsu.__pilih = { id: "admin" };
  vscodePalsu.__isian = ["bukan-alamat", TOKEN_ADMIN];
  const tolak = await auth.login();
  cek("login dibatalkan", tolak === false);
  cek("ada keluhan validasi", Boolean(vscodePalsu.__keluhan), vscodePalsu.__keluhan);
  cek("alamat tidak berubah", setelan.backendUrl === "ws://localhost:3000");

  console.log("\n10) Alamat yang sudah diisi tidak ditanya lagi");
  setelan = { backendUrl: BACKEND };
  vscodePalsu.__pilih = { id: "admin" };
  vscodePalsu.__isian = [TOKEN_ADMIN];  // hanya satu isian: tidak ditanya alamat
  const langsung = await auth.login();
  cek("langsung ke kredensial", langsung === true);

  console.log(`\n${lulus} lulus, ${gagal} gagal`);
  process.exit(gagal ? 1 : 0);
})();
