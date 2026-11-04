import * as vscode from "vscode";
import { BACKEND_BAWAAN, getConfig, getHttpBaseUrl } from "./config";

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
const berubah = new vscode.EventEmitter<void>();
export const onCredentialChanged = berubah.event;

let identitas: Identitas | null = null;

export function initAuth(context: vscode.ExtensionContext) {
  simpanan = context.secrets;
}

export async function getCredential(): Promise<string | undefined> {
  const tersimpan = await simpanan?.get(KUNCI);
  if (tersimpan) return tersimpan;

  // Jalur warisan: dosen yang sudah memakai setting lama tetap bisa bekerja
  // sampai dia masuk lewat perintah login.
  const dariSetting = vscode.workspace.getConfiguration("liveCoding").get<string>("teacherToken", "");
  return dariSetting || undefined;
}

export async function setCredential(nilai: string | undefined) {
  if (nilai) await simpanan?.store(KUNCI, nilai);
  else await simpanan?.delete(KUNCI);
  identitas = null;
  berubah.fire();
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

// Alamat server dipakai ulang sampai URL-nya benar; orang biasanya menyalin
// alamat halaman admin yang berawalan https, jadi itu diterima dan diubah.
function keWebSocket(nilai: string): string | null {
  const bersih = nilai.trim().replace(/\/+$/, "");
  if (!bersih) return null;
  const ws = bersih.replace(/^http(s?):\/\//, "ws$1://");
  return /^wss?:\/\/[^\s/]+/.test(ws) ? ws : null;
}

// Bawaan menunjuk ke localhost. Tanpa langkah ini tiap dosen akan menabrak
// "tidak bisa terhubung" dulu, lalu harus diberi tahu soal satu setelan.
async function pastikanBackend(): Promise<boolean> {
  const config = vscode.workspace.getConfiguration("liveCoding");
  if (config.get<string>("backendUrl", BACKEND_BAWAAN) !== BACKEND_BAWAAN) return true;

  const jawaban = await vscode.window.showInputBox({
    title: "Alamat server Live Coding",
    prompt: "Tanyakan ke admin kampus. Biarkan apa adanya kalau kamu menjalankan backend di komputer sendiri.",
    value: BACKEND_BAWAAN,
    ignoreFocusOut: true,
    validateInput: (nilai) =>
      keWebSocket(nilai) ? null : "Harus berupa alamat ws:// atau wss:// — misalnya wss://api.kampus.ac.id",
  });
  if (jawaban === undefined) return false;

  const url = keWebSocket(jawaban);
  if (!url) return false;
  // Disimpan sebagai setelan User: satu dosen memakai server yang sama untuk
  // semua project-nya, dan alamat server bukan rahasia.
  await config.update("backendUrl", url, vscode.ConfigurationTarget.Global);
  return true;
}

export async function login(): Promise<boolean> {
  if (!(await pastikanBackend())) return false;

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
    await setCredential(token.trim());
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

// Dipakai saat aktivasi dan setelah login, untuk tahu sedang masuk sebagai siapa.
export async function refreshIdentitas(): Promise<Identitas | null> {
  const token = await getCredential();
  if (!token) {
    setIdentitas(null);
    return null;
  }
  try {
    const response = await fetch(`${getHttpBaseUrl()}/api/admin/check`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setIdentitas(null);
      return null;
    }
    const data = (await response.json()) as Identitas;
    setIdentitas({ admin: Boolean(data.admin), teacher: data.teacher ?? null });
    return getIdentitas();
  } catch {
    // Backend tidak terjangkau; jangan anggap kredensialnya salah.
    return getIdentitas();
  }
}

export { getConfig };
