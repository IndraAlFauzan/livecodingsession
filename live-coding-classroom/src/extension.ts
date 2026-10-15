import * as vscode from "vscode";
import { buildFileTree } from "./fileTree";
import { getConfig, createIgnoreMatcher } from "./config";
import {
  connectSocket,
  disconnectSocket,
  sendMessage,
  isConnected,
} from "./socketClient";
import {
  canShareFile,
  normalizeRelativePath,
  readTextFile,
  isIgnoredPath,
  isAssetFile,
} from "./fileUtils";
import { detectLanguage } from "./languageDetector";
import { debounceByKey, clearDebounces } from "./debounce";

let currentSessionId: string | null = null;
let currentWorkspace: vscode.WorkspaceFolder | null = null;
let watcher: vscode.FileSystemWatcher | null = null;
let disposables: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext) {
  const startCommand = vscode.commands.registerCommand(
    "liveCoding.startSession",
    startSession,
  );

  const stopCommand = vscode.commands.registerCommand(
    "liveCoding.stopSession",
    stopSession,
  );

  const copyCommand = vscode.commands.registerCommand(
    "liveCoding.copyStudentLink",
    copyStudentLink,
  );

  context.subscriptions.push(startCommand, stopCommand, copyCommand);
}

async function startSession() {
  const workspace = vscode.workspace.workspaceFolders?.[0];

  if (!workspace) {
    vscode.window.showErrorMessage(
      "Open a workspace folder before starting a live coding session.",
    );
    return;
  }

  if (isConnected()) {
    vscode.window.showWarningMessage(
      "A live coding session is already running. Stop it before starting a new one.",
    );
    return;
  }

  const sessionId = await vscode.window.showInputBox({
    prompt: "Enter session ID",
    value: createDefaultSessionId(),
    ignoreFocusOut: true,
  });

  if (!sessionId) return;

  const config = getConfig();

  currentSessionId = sessionId;
  currentWorkspace = workspace;

  connectSocket(
    config.backendUrl,
    async () => {
      sendMessage({
        type: "teacher:join",
        sessionId,
        projectName: workspace.name,
        teacherToken: config.teacherToken,
      });

      await sendProjectSnapshot();
      await sendInitialFiles();

      registerWatchers();
      registerActiveEditorListener();
      await sendCurrentActiveFile();

      const studentUrl = buildStudentUrl(sessionId);

      vscode.window.showInformationMessage(
        `Live Coding started. Student URL: ${studentUrl}`,
      );
    },
    () => {
      vscode.window.showWarningMessage(
        "Live Coding backend connection closed.",
      );
    },
    (error) => {
      vscode.window.showErrorMessage(
        `Live Coding connection error: ${error.message}`,
      );
    },
  );
}

async function stopSession() {
  if (currentSessionId) {
    const sessionId = currentSessionId;

    sendMessage({
      type: "teacher:leave",
      sessionId,
    });
  }

  watcher?.dispose();
  watcher = null;

  for (const disposable of disposables) {
    disposable.dispose();
  }

  disposables = [];

  clearDebounces();
  disconnectSocket();

  currentSessionId = null;
  currentWorkspace = null;

  vscode.window.showInformationMessage("Live Coding stopped.");
}

async function copyStudentLink() {
  if (!currentSessionId) {
    vscode.window.showWarningMessage("No active live coding session.");
    return;
  }

  const sessionId = currentSessionId;
  const studentUrl = buildStudentUrl(sessionId);

  await vscode.env.clipboard.writeText(studentUrl);

  vscode.window.showInformationMessage(`Student URL copied: ${studentUrl}`);
}

async function sendProjectSnapshot() {
  if (!currentSessionId || !currentWorkspace) return;

  const sessionId = currentSessionId;
  const workspace = currentWorkspace;

  const matcher = createIgnoreMatcher();
  const tree = buildFileTree(workspace.uri.fsPath, matcher);

  sendMessage({
    type: "project:snapshot",
    sessionId,
    tree,
  });
}

async function sendInitialFiles() {
  if (!currentSessionId || !currentWorkspace) return;

  const sessionId = currentSessionId;
  const workspace = currentWorkspace;

  async function walk(dirUri: vscode.Uri): Promise<void> {
    let entries: [string, vscode.FileType][];

    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return;
    }

    for (const [name, type] of entries) {
      const childUri = vscode.Uri.joinPath(dirUri, name);
      const relativePath = normalizeRelativePath(childUri);

      if (isIgnoredPath(relativePath)) {
        continue;
      }

      if (type === vscode.FileType.Directory) {
        await walk(childUri);
        continue;
      }

      if (type !== vscode.FileType.File) {
        continue;
      }

      if (isAssetFile(relativePath)) {
        sendMessage({
          type: "asset:metadata",
          sessionId,
          path: relativePath,
          assetType: "binary",
          updatedAt: new Date().toISOString(),
        });

        continue;
      }

      const allowed = await canShareFile(childUri);

      if (!allowed) {
        continue;
      }

      try {
        const content = await readTextFile(childUri);

        sendMessage({
          type: "file:create",
          sessionId,
          path: relativePath,
          content,
          language: detectLanguage(relativePath),
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Abaikan file yang gagal dibaca sebagai text.
      }
    }
  }

  await walk(workspace.uri);
}

function registerWatchers() {
  if (!currentSessionId || !currentWorkspace) return;

  watcher?.dispose();

  watcher = vscode.workspace.createFileSystemWatcher(
    "**/*",
    false,
    false,
    false,
  );

  watcher.onDidChange((uri) => {
    const relativePath = normalizeRelativePath(uri);

    debounceByKey(
      relativePath,
      () => {
        sendFileUpdate(uri);
      },
      300,
    );
  });

  watcher.onDidCreate((uri) => {
    const relativePath = normalizeRelativePath(uri);

    debounceByKey(
      relativePath,
      async () => {
        await sendFileCreate(uri);
        await sendProjectSnapshot();
      },
      300,
    );
  });

  watcher.onDidDelete((uri) => {
    if (!currentSessionId) return;

    const sessionId = currentSessionId;
    const relativePath = normalizeRelativePath(uri);

    if (isIgnoredPath(relativePath)) return;

    sendMessage({
      type: "file:delete",
      sessionId,
      path: relativePath,
    });

    debounceByKey(
      "tree:update",
      () => {
        sendProjectSnapshot();
      },
      300,
    );
  });
}

function registerActiveEditorListener() {
  const disposable = vscode.window.onDidChangeActiveTextEditor(() => {
    sendCurrentActiveFile();
  });

  disposables.push(disposable);
}

async function sendCurrentActiveFile() {
  if (!currentSessionId) return;

  const sessionId = currentSessionId;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const uri = editor.document.uri;
  if (uri.scheme !== "file") return;

  const relativePath = normalizeRelativePath(uri);

  if (isIgnoredPath(relativePath)) return;

  sendMessage({
    type: "teacher:active-file",
    sessionId,
    path: relativePath,
  });

  await sendFileUpdate(uri);
}

async function sendFileUpdate(uri: vscode.Uri) {
  if (!currentSessionId) return;

  const sessionId = currentSessionId;

  try {
    const relativePath = normalizeRelativePath(uri);

    if (isIgnoredPath(relativePath)) return;

    if (isAssetFile(relativePath)) {
      sendMessage({
        type: "asset:metadata",
        sessionId,
        path: relativePath,
        assetType: "binary",
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    const allowed = await canShareFile(uri);

    if (!allowed) return;

    const content = await readTextFile(uri);

    sendMessage({
      type: "file:update",
      sessionId,
      path: relativePath,
      content,
      language: detectLanguage(relativePath),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to send file update:", error);
  }
}

async function sendFileCreate(uri: vscode.Uri) {
  if (!currentSessionId) return;

  const sessionId = currentSessionId;

  let stat: vscode.FileStat;

  try {
    stat = await vscode.workspace.fs.stat(uri);
  } catch {
    return;
  }

  const relativePath = normalizeRelativePath(uri);

  if (isIgnoredPath(relativePath)) return;

  if (stat.type === vscode.FileType.Directory) {
    sendMessage({
      type: "folder:create",
      sessionId,
      path: relativePath,
    });

    return;
  }

  if (stat.type !== vscode.FileType.File) {
    return;
  }

  if (isAssetFile(relativePath)) {
    sendMessage({
      type: "asset:metadata",
      sessionId,
      path: relativePath,
      assetType: "binary",
      updatedAt: new Date().toISOString(),
    });

    return;
  }

  const allowed = await canShareFile(uri);

  if (!allowed) return;

  const content = await readTextFile(uri);

  sendMessage({
    type: "file:create",
    sessionId,
    path: relativePath,
    content,
    language: detectLanguage(relativePath),
    updatedAt: new Date().toISOString(),
  });
}

function buildStudentUrl(sessionId: string): string {
  const config = getConfig();

  return `${config.studentBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(
    sessionId,
  )}`;
}

function createDefaultSessionId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `session-${random}`;
}

export function deactivate() {
  stopSession();
}
