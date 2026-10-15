import * as vscode from "vscode";
import { api, Course, Meeting } from "./api";
import { buildFileTree } from "./fileTree";
import { getConfig, createIgnoreMatcher } from "./config";
import { connectSocket, disconnectSocket, sendMessage, isConnected } from "./socketClient";
import { canShareFile, normalizeRelativePath, readTextFile, isIgnoredPath, isAssetFile } from "./fileUtils";
import { detectLanguage } from "./languageDetector";
import { debounceByKey, clearDebounces } from "./debounce";
import { SocketPayload } from "./types";

type LiveTarget = {
  meetingId: string;
  continuesFrom: string | null;
  label: string;
};

type LiveState = {
  target: LiveTarget;
  workspace: vscode.WorkspaceFolder;
  joined: boolean;
  rejected: boolean;
  studentUrl: string | null;
  accessCode: string | null;
};

const STATUS_LABEL: Record<Meeting["status"], string> = {
  draft: "belum dimulai",
  live: "sedang live",
  finished: "selesai",
};

let live: LiveState | null = null;
let stopping = false;
let watcher: vscode.FileSystemWatcher | null = null;
let disposables: vscode.Disposable[] = [];
let statusItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusItem.command = "liveCoding.menu";

  context.subscriptions.push(
    statusItem,
    vscode.commands.registerCommand("liveCoding.startSession", startSession),
    vscode.commands.registerCommand("liveCoding.stopSession", stopSession),
    vscode.commands.registerCommand("liveCoding.copyStudentLink", copyStudentLink),
    vscode.commands.registerCommand("liveCoding.menu", showLiveMenu),
  );
}

// ---------- memilih target ----------

async function startSession() {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    vscode.window.showErrorMessage("Buka folder project dulu sebelum memulai live coding.");
    return;
  }
  if (isConnected()) {
    vscode.window.showWarningMessage("Sesi live coding masih berjalan. Hentikan dulu sebelum memulai yang baru.");
    return;
  }

  try {
    const target = await pickTarget(workspace.name);
    if (target) startLive(workspace, target);
  } catch (error) {
    vscode.window.showErrorMessage(`Live Coding: ${(error as Error).message}`);
  }
}

async function pickTarget(projectName: string): Promise<LiveTarget | undefined> {
  const course = await pickCourse();
  if (!course) return;

  const picked = await pickMeeting(course);
  if (!picked) return;

  const continuesFrom = await pickContinuation(picked.meeting, picked.meetings, projectName);
  if (continuesFrom === undefined) return;

  const { meeting } = picked;
  return {
    meetingId: meeting.id,
    continuesFrom,
    label: `${course.name} · Pertemuan ${meeting.number}`,
  };
}

async function pickCourse(): Promise<Course | undefined> {
  const courses = await api.listCourses();
  type Item = vscode.QuickPickItem & { course?: Course };

  const items: Item[] = [
    ...courses.map((course) => ({
      label: course.name,
      description: course.accessCode,
      detail: `${course.meetingCount} pertemuan`,
      course,
    })),
    { label: "$(add) Mata kuliah baru...", alwaysShow: true },
  ];

  const choice = await vscode.window.showQuickPick(items, {
    title: "Live Coding (1/3): Pilih mata kuliah",
    placeHolder: courses.length ? "Mata kuliah yang diajarkan" : "Belum ada mata kuliah, buat yang baru",
    ignoreFocusOut: true,
  });
  if (!choice) return;
  if (choice.course) return choice.course;

  const name = await vscode.window.showInputBox({
    title: "Mata kuliah baru",
    prompt: "Nama mata kuliah",
    placeHolder: "Contoh: Pemrograman Mobile",
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? null : "Nama wajib diisi."),
  });
  if (!name) return;
  const course = await api.createCourse(name.trim());
  vscode.window.showInformationMessage(`Mata kuliah dibuat. Kode akses mahasiswa: ${course.accessCode}`);
  return course;
}

async function pickMeeting(course: Course): Promise<{ meeting: Meeting; meetings: Meeting[] } | undefined> {
  const meetings = await api.listMeetings(course.id);
  const nextNumber = Math.max(0, ...meetings.map((m) => m.number)) + 1;
  type Item = vscode.QuickPickItem & { meeting?: Meeting };

  const items: Item[] = [
    { label: `$(add) Pertemuan baru (Pertemuan ${nextNumber})`, alwaysShow: true },
    ...[...meetings]
      .sort((a, b) => b.number - a.number)
      .map((meeting) => ({
        label: `Pertemuan ${meeting.number}${meeting.title ? ` · ${meeting.title}` : ""}`,
        description: STATUS_LABEL[meeting.status] + (meeting.visible ? "" : " · disembunyikan"),
        detail: meeting.continuesFrom ? `Lanjutan dari Pertemuan ${meeting.continuesFrom.number}` : undefined,
        meeting,
      })),
  ];

  const choice = await vscode.window.showQuickPick(items, {
    title: `Live Coding (2/3): ${course.name}`,
    placeHolder: "Pilih pertemuan",
    ignoreFocusOut: true,
  });
  if (!choice) return;

  if (!choice.meeting) {
    const title = await vscode.window.showInputBox({
      title: `Pertemuan ${nextNumber}`,
      prompt: "Judul pertemuan (opsional, bisa diubah nanti di halaman admin)",
      placeHolder: "Contoh: State Management",
      ignoreFocusOut: true,
    });
    if (title === undefined) return;
    const meeting = await api.createMeeting(course.id, title.trim());
    return { meeting, meetings: [...meetings, meeting] };
  }

  const meeting = choice.meeting;
  if (meeting.teacherConnected) {
    vscode.window.showErrorMessage(`Pertemuan ${meeting.number} sedang live dari VS Code lain.`);
    return;
  }
  if (meeting.status === "finished") {
    const confirm = await vscode.window.showWarningMessage(
      `Pertemuan ${meeting.number} sudah punya kode tersimpan. Isinya akan diganti dengan kondisi project sekarang.`,
      { modal: true },
      "Ganti isinya",
    );
    if (confirm !== "Ganti isinya") return;
  }
  return { meeting, meetings };
}

async function pickContinuation(
  meeting: Meeting,
  meetings: Meeting[],
  projectName: string,
): Promise<string | null | undefined> {
  const candidates = meetings
    .filter((m) => m.id !== meeting.id && m.status !== "draft")
    .sort((a, b) => {
      const rank = (m: Meeting) =>
        m.id === meeting.continuesFrom?.id ? 0 : m.projectName === projectName ? 1 : 2;
      return rank(a) - rank(b) || b.number - a.number;
    });
  if (candidates.length === 0) return null;

  type Item = vscode.QuickPickItem & { meetingId: string | null };
  const newProject: Item = {
    label: "$(new-folder) Project baru",
    detail: "Bukan lanjutan dari pertemuan sebelumnya",
    meetingId: null,
  };
  const continuationItems: Item[] = candidates.map((m) => ({
    label: `$(history) Lanjutan dari Pertemuan ${m.number}`,
    description: m.title,
    detail: m.projectName === projectName ? `Project sama: ${projectName}` : m.projectName ? `Project: ${m.projectName}` : undefined,
    meetingId: m.id,
  }));

  const likelyContinuation =
    candidates[0].id === meeting.continuesFrom?.id || candidates[0].projectName === projectName;
  const items = likelyContinuation ? [...continuationItems, newProject] : [newProject, ...continuationItems];

  const choice = await vscode.window.showQuickPick(items, {
    title: `Live Coding (3/3): Pertemuan ${meeting.number}`,
    placeHolder: "Apakah ini lanjutan project dari pertemuan sebelumnya?",
    ignoreFocusOut: true,
  });
  return choice ? choice.meetingId : undefined;
}

// ---------- sesi live ----------

function startLive(workspace: vscode.WorkspaceFolder, target: LiveTarget) {
  const config = getConfig();
  live = { target, workspace, joined: false, rejected: false, studentUrl: null, accessCode: null };
  stopping = false;

  statusItem.text = "$(sync~spin) Live Coding: menghubungkan...";
  statusItem.tooltip = target.label;
  statusItem.show();

  connectSocket(config.backendUrl, {
    onOpen: () => {
      sendMessage({
        type: "teacher:join",
        meetingId: target.meetingId,
        teacherToken: config.teacherToken,
        projectName: workspace.name,
        continuesFrom: target.continuesFrom,
      });
    },
    onMessage: handleBackendMessage,
    onError: (error) => console.error("[Live Coding Classroom]", error),
    onClose: () => {
      if (stopping || !live) return;
      const { joined, rejected } = live;
      teardown();

      if (rejected) return;
      if (!joined) {
        vscode.window.showErrorMessage(`Live Coding: tidak bisa terhubung ke backend (${config.backendUrl}).`);
        return;
      }
      vscode.window
        .showWarningMessage("Live Coding: koneksi ke backend terputus. Sesi dihentikan.", "Sambung lagi")
        .then((choice) => {
          if (choice && !isConnected()) startLive(workspace, target);
        });
    },
  });
}

async function handleBackendMessage(message: SocketPayload) {
  if (!live) return;

  if (message.type === "teacher:joined") {
    live.joined = true;
    live.studentUrl = String(message.studentUrl);
    live.accessCode = String(message.accessCode);

    await sendProjectSnapshot();
    await sendInitialFiles();
    registerWatchers();
    registerActiveEditorListener();
    await sendCurrentActiveFile();

    statusItem.text = `$(broadcast) Live: ${live.target.label}`;
    statusItem.tooltip = "Klik untuk salin link atau hentikan sesi";

    const choice = await vscode.window.showInformationMessage(
      `Live coding dimulai: ${live.target.label}. Kode akses mahasiswa: ${live.accessCode}`,
      "Salin link",
      "Salin kode",
    );
    if (choice === "Salin link") copyStudentLink();
    if (choice === "Salin kode") copyAccessCode();
    return;
  }

  if (message.type === "error") {
    if (!live.joined) {
      live.rejected = true;
      vscode.window.showErrorMessage(`Live Coding: ${message.message}`);
    } else {
      vscode.window.showWarningMessage(`Live Coding: ${message.message}`);
    }
  }
}

async function stopSession() {
  if (!isConnected()) {
    vscode.window.showInformationMessage("Tidak ada sesi live coding yang berjalan.");
    return;
  }
  stopping = true;
  sendMessage({ type: "teacher:leave" });
  teardown();
  vscode.window.showInformationMessage("Live coding dihentikan. Kode pertemuan tersimpan dan statusnya Selesai.");
}

function teardown() {
  watcher?.dispose();
  watcher = null;
  for (const disposable of disposables) disposable.dispose();
  disposables = [];
  clearDebounces();
  disconnectSocket();
  live = null;
  statusItem?.hide();
}

async function showLiveMenu() {
  if (!live?.joined) return;
  const choice = await vscode.window.showQuickPick(["Salin link mahasiswa", "Salin kode akses", "Hentikan sesi"], {
    title: live.target.label,
  });
  if (choice === "Salin link mahasiswa") copyStudentLink();
  if (choice === "Salin kode akses") copyAccessCode();
  if (choice === "Hentikan sesi") stopSession();
}

async function copyStudentLink() {
  if (!live?.studentUrl) {
    vscode.window.showWarningMessage("Tidak ada sesi live coding yang berjalan.");
    return;
  }
  await vscode.env.clipboard.writeText(live.studentUrl);
  vscode.window.showInformationMessage(`Link mahasiswa disalin: ${live.studentUrl}`);
}

async function copyAccessCode() {
  if (!live?.accessCode) return;
  await vscode.env.clipboard.writeText(live.accessCode);
  vscode.window.showInformationMessage(`Kode akses disalin: ${live.accessCode}`);
}

// ---------- sinkronisasi file ----------

async function sendProjectSnapshot() {
  if (!live) return;
  const tree = buildFileTree(live.workspace.uri.fsPath, createIgnoreMatcher());
  sendMessage({ type: "project:snapshot", tree });
}

async function sendInitialFiles() {
  if (!live) return;

  async function walk(dirUri: vscode.Uri): Promise<void> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return;
    }

    for (const [name, type] of entries) {
      const childUri = vscode.Uri.joinPath(dirUri, name);
      if (isIgnoredPath(normalizeRelativePath(childUri))) continue;

      if (type === vscode.FileType.Directory) await walk(childUri);
      else if (type === vscode.FileType.File) await sendFile(childUri, "file:create");
    }
  }

  await walk(live.workspace.uri);
}

async function sendFile(uri: vscode.Uri, type: "file:create" | "file:update") {
  if (!live) return;

  try {
    const relativePath = normalizeRelativePath(uri);
    if (isIgnoredPath(relativePath)) return;

    if (isAssetFile(relativePath)) {
      sendMessage({ type: "asset:metadata", path: relativePath, updatedAt: new Date().toISOString() });
      return;
    }

    if (!(await canShareFile(uri))) return;

    sendMessage({
      type,
      path: relativePath,
      content: await readTextFile(uri),
      language: detectLanguage(relativePath),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Live Coding Classroom] Gagal mengirim file:", error);
  }
}

function registerWatchers() {
  watcher?.dispose();
  watcher = vscode.workspace.createFileSystemWatcher("**/*");

  watcher.onDidChange((uri) => {
    debounceByKey(normalizeRelativePath(uri), () => sendFile(uri, "file:update"), 300);
  });

  watcher.onDidCreate((uri) => {
    debounceByKey(
      normalizeRelativePath(uri),
      async () => {
        let stat: vscode.FileStat;
        try {
          stat = await vscode.workspace.fs.stat(uri);
        } catch {
          return;
        }
        if (stat.type === vscode.FileType.File) await sendFile(uri, "file:create");
        debounceByKey("tree:update", sendProjectSnapshot, 300);
      },
      300,
    );
  });

  watcher.onDidDelete((uri) => {
    const relativePath = normalizeRelativePath(uri);
    if (isIgnoredPath(relativePath)) return;
    sendMessage({ type: "file:delete", path: relativePath });
    debounceByKey("tree:update", sendProjectSnapshot, 300);
  });
}

function registerActiveEditorListener() {
  disposables.push(vscode.window.onDidChangeActiveTextEditor(() => sendCurrentActiveFile()));
}

async function sendCurrentActiveFile() {
  const editor = vscode.window.activeTextEditor;
  if (!live || !editor || editor.document.uri.scheme !== "file") return;
  if (vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.toString() !== live.workspace.uri.toString()) {
    return;
  }

  const relativePath = normalizeRelativePath(editor.document.uri);
  if (isIgnoredPath(relativePath)) return;

  sendMessage({ type: "teacher:active-file", path: relativePath });
  await sendFile(editor.document.uri, "file:update");
}

export function deactivate() {
  if (isConnected()) {
    stopping = true;
    sendMessage({ type: "teacher:leave" });
    teardown();
  }
}
