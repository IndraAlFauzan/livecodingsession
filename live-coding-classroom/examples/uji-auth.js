// Menguji dist/auth.js dengan modul "vscode" palsu. Yang paling penting:
// perpindahan dari settings.json ke SecretStorage, karena jalur itu hanya
// terjadi sekali di komputer tiap dosen dan tidak terlihat dari luar.
const Module = require("module");
const path = require("path");

const BACKEND = process.env.BACKEND_WS || "ws://127.0.0.1:4411";
// Bawaan dari package.json. teacherToken sengaja kosong: bawaan berbentuk
// rahasia membuat getCredential selalu mengira ada kredensial.
const BAWAAN = { backendUrl: "wss://belivecoding.devrisetiaf.cloud", teacherToken: "" };
let setelan = { backendUrl: BACKEND };
const rahasia = new Map();
const pesan = [];

const vscodePalsu = {
  workspace: {
    // Meniru VS Code: get() jatuh ke bawaan package.json kalau setelannya tidak
    // diisi, sementara inspect() hanya melihat yang memang disetel orang.
    getConfiguration: () => ({
      get: (k, d) => (k in setelan ? setelan[k] : k in BAWAAN ? BAWAAN[k] : d),
      inspect: (k) => ({ defaultValue: BAWAAN[k], globalValue: setelan[k] }),
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
  // Pernah bocor lewat sini: get() mengembalikan bawaan package.json, jadi
  // extension mengira punya kredensial padahal setelannya tidak pernah diisi.
  BAWAAN.teacherToken = "dev-secret-token";
  cek("bawaan package.json tidak dianggap kredensial", (await auth.getCredential()) === undefined);
  BAWAAN.teacherToken = "";
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
  cek("hasil periksa: masuk", (await auth.refreshIdentitas()) === "masuk");
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

  console.log("\n8) Token admin diperiksa sebelum disimpan");
  await auth.logout();
  vscodePalsu.__pilih = { id: "admin" };
  vscodePalsu.__isian = ["token-ngawur"];
  const tolakAdmin = await auth.login();
  cek("token salah ditolak", tolakAdmin === false);
  cek("tidak tersimpan", rahasia.size === 0, `${rahasia.size} rahasia`);
  cek("panel tidak mengira sudah masuk", (await auth.getCredential()) === undefined);

  console.log("\n9) Kredensial yang ditolak server dibuang sendiri");
  // Disisipkan langsung ke SecretStorage, meniru token yang dicabut admin.
  await auth.setCredential("sudah-dicabut");
  cek("tersimpan dulu", (await auth.getCredential()) === "sudah-dicabut");
  const hasil = await auth.refreshIdentitas();
  cek("hasilnya ditolak", hasil === "ditolak", hasil);
  cek("kredensialnya ikut dibuang", (await auth.getCredential()) === undefined);

  console.log("\n10) Server tak terjangkau tidak membuang kredensial");
  setelan = { backendUrl: "ws://127.0.0.1:9" };  // port mati
  await auth.setCredential("masih-sah");
  const luring = await auth.refreshIdentitas();
  cek("hasilnya luring", luring === "luring", luring);
  cek("kredensial dipertahankan", (await auth.getCredential()) === "masih-sah");
  setelan = { backendUrl: BACKEND };
  await auth.setCredential(undefined);

  // Bersih-bersih: akun uji dibuang lagi.
  await fetch(`${HTTP}/api/admin/teachers/${dibuat.teacher.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN_ADMIN}` },
    body: JSON.stringify({ active: false }),
  });

  console.log(`\n${lulus} lulus, ${gagal} gagal`);
  process.exit(gagal ? 1 : 0);
})();
