import * as vscode from "vscode";
import { getConfig, getHttpBaseUrl } from "./config";

// Kredensial disimpan di SecretStorage, bukan settings.json.
//
// settings.json sering ikut Settings Sync ke akun, dan untuk setelan Workspace
// ia hidup di .vscode/settings.json yang gampang ter-commit. Selama penggunanya
// satu orang risikonya kecil; begitu ada sepuluh dosen, hampir pasti bocor.
const KUNCI = "liveCoding.credential";

export type Identitas = {
  admin: boolean;
  teacher: { id: number; username: string; code: string; name: string } | null;
};

let simpanan: vscode.SecretStorage | undefined;
let identitas: Identitas | null = null;

export function initAuth(context: vscode.ExtensionContext) {
  simpanan = context.secrets;
}

export async function getCredential(): Promise<string | undefined> {
  const tersimpan = await simpanan?.get(KUNCI);
  if (tersimpan) return tersimpan;

  // Jalur warisan: dosen yang sudah memakai setting lama tetap bisa bekerja
  // sampai dia masuk lewat perintah login.
  //
  // inspect(), bukan get(). get() mengembalikan nilai bawaan dari package.json
  // kalau setelannya tidak diisi -- artinya extension selalu mengira punya
  // kredensial, panel menawarkan "Mulai sesi live", dan Keluar pun tidak
  // menolong karena nilainya muncul lagi. inspect() hanya melihat yang memang
  // disetel orang.
  const info = vscode.workspace.getConfiguration("liveCoding").inspect<string>("teacherToken");
  const dariSetting = info?.workspaceFolderValue ?? info?.workspaceValue ?? info?.globalValue;
  return dariSetting?.trim() || undefined;
}

export async function setCredential(nilai: string | undefined) {
  if (nilai) await simpanan?.store(KUNCI, nilai);
  else await simpanan?.delete(KUNCI);
  identitas = null;
}

export function getIdentitas(): Identitas | null {
  return identitas;
}

export function setIdentitas(nilai: Identitas | null) {
  identitas = nilai;
}

// Nama yang tampil di status bar dan panel.
export function labelIdentitas(): string {
  if (!identitas) return "belum masuk";
  if (identitas.admin) return "Admin kampus";
  return identitas.teacher ? `${identitas.teacher.code} · ${identitas.teacher.name}` : "Dosen";
}

// Mengembalikan identitas kalau kredensialnya sah, null kalau tidak. Pesan
// galatnya dibedakan: token salah dan server tak terjangkau butuh tindakan
// yang berbeda.
async function periksaToken(token: string): Promise<Identitas | null> {
  let response: Response;
  try {
    response = await fetch(`${getHttpBaseUrl()}/api/admin/check`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    vscode.window.showErrorMessage(`Tidak bisa terhubung ke backend (${getHttpBaseUrl()}).`);
    return null;
  }

  if (response.status === 401) {
    vscode.window.showErrorMessage("Token tidak cocok dengan TEACHER_TOKEN di server.");
    return null;
  }
  if (!response.ok) {
    vscode.window.showErrorMessage(`Backend menolak (${response.status}).`);
    return null;
  }

  const data = (await response.json()) as Identitas;
  return { admin: Boolean(data.admin), teacher: data.teacher ?? null };
}

export async function login(): Promise<boolean> {
  const cara = await vscode.window.showQuickPick(
    [
      { label: "Masuk sebagai dosen", detail: "Email dan kata sandi dari admin kampus", id: "dosen" },
      { label: "Masuk sebagai admin kampus", detail: "TEACHER_TOKEN dari env server", id: "admin" },
    ],
    { title: "Live Coding: masuk", placeHolder: "Pilih cara masuk" },
  );
  if (!cara) return false;

  if (cara.id === "admin") {
    const token = await vscode.window.showInputBox({
      title: "Teacher token",
      prompt: "Harus sama dengan TEACHER_TOKEN di server",
      password: true,
      ignoreFocusOut: true,
    });
    if (!token?.trim()) return false;

    // Diperiksa dulu, baru disimpan. Menyimpan tanpa memeriksa membuat panel
    // mengira sudah masuk padahal setiap permintaan nanti ditolak 401 --
    // salah ketik satu karakter berakhir di galat yang membingungkan.
    const siapa = await periksaToken(token.trim());
    if (!siapa) return false;

    await setCredential(token.trim());
    setIdentitas(siapa);
    vscode.window.showInformationMessage("Masuk sebagai admin kampus.");
    return true;
  }

  const username = await vscode.window.showInputBox({
    title: "Masuk sebagai dosen (1/2)",
    prompt: "Username yang didaftarkan admin kampus",
    placeHolder: "och",
    ignoreFocusOut: true,
  });
  if (!username?.trim()) return false;

  const sandi = await vscode.window.showInputBox({
    title: "Masuk sebagai dosen (2/2)",
    prompt: "Kata sandi",
    password: true,
    ignoreFocusOut: true,
  });
  if (!sandi) return false;

  try {
    const response = await fetch(`${getHttpBaseUrl()}/api/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password: sandi }),
    });
    const data = (await response.json().catch(() => null)) as
      | { token?: string; teacher?: Identitas["teacher"]; error?: string }
      | null;

    if (!response.ok || !data?.token) {
      vscode.window.showErrorMessage(data?.error || `Gagal masuk (${response.status}).`);
      return false;
    }

    await setCredential(data.token);
    setIdentitas({ admin: false, teacher: data.teacher ?? null });
    vscode.window.showInformationMessage(
      data.teacher ? `Masuk sebagai ${data.teacher.code} — ${data.teacher.name}.` : "Berhasil masuk.",
    );
    return true;
  } catch {
    vscode.window.showErrorMessage(`Tidak bisa terhubung ke backend (${getHttpBaseUrl()}).`);
    return false;
  }
}

export async function logout() {
  const token = await getCredential();
  // Tanda sesi dosen perlu dicabut di server; token admin tidak bisa dicabut.
  if (token && identitas && !identitas.admin) {
    try {
      await fetch(`${getHttpBaseUrl()}/api/admin/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      // Kegagalan jaringan tidak boleh menahan keluar di sisi ini.
    }
  }
  setIdentitas(null);
  await setCredential(undefined);
  vscode.window.showInformationMessage("Sudah keluar dari Live Coding.");
}

// Dipakai saat aktivasi dan setelah login.
//
// Tiga hasil yang berbeda, dan bedanya penting: "ditolak" harus membuang
// kredensialnya supaya panel kembali menawarkan Masuk, sementara "server tidak
// terjangkau" tidak boleh -- WiFi kampus putus sebentar bukan alasan menyuruh
// dosen masuk ulang.
export type HasilPeriksa = "masuk" | "ditolak" | "luring" | "kosong";

export async function refreshIdentitas(): Promise<HasilPeriksa> {
  const token = await getCredential();
  if (!token) {
    setIdentitas(null);
    return "kosong";
  }

  let response: Response;
  try {
    response = await fetch(`${getHttpBaseUrl()}/api/admin/check`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return "luring";
  }

  if (response.status === 401) {
    // Kredensialnya memang sudah tidak berlaku: dicabut admin, akun
    // dinonaktifkan, atau salah sejak awal. Dibuang supaya tidak menyangkut.
    setIdentitas(null);
    await setCredential(undefined);
    return "ditolak";
  }
  if (!response.ok) return "luring";

  const data = (await response.json()) as Identitas;
  setIdentitas({ admin: Boolean(data.admin), teacher: data.teacher ?? null });
  return "masuk";
}

export { getConfig };
