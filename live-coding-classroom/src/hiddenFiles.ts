import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
  IGNORE_FILE,
  createIgnoreMatcher,
  createManualMatcher,
  ignoreFilePath,
  invalidateIgnoreMatcher,
  readManualRules,
  workspaceRoot,
} from "./config";

const HEADER = "# File/folder yang tidak dibagikan ke mahasiswa Live Coding (format .gitignore)";
const decorationsChanged = new vscode.EventEmitter<undefined>();
let onRulesChanged: () => void = () => {};

function relativePath(uri: vscode.Uri): string | null {
  const root = workspaceRoot();
  if (!root || uri.scheme !== "file") return null;
  const rel = path.relative(root.uri.fsPath, uri.fsPath).split(path.sep).join("/");
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : null;
}

// Pola diawali "/" agar hanya cocok dengan path itu, bukan file bernama sama di folder lain.
function toRule(uri: vscode.Uri): string | null {
  const rel = relativePath(uri);
  return rel ? `/${rel}` : null;
}

function readLines(): string[] {
  const file = ignoreFilePath();
  if (!file) return [];
  try {
    return fs.readFileSync(file, "utf8").split(/\r?\n/);
  } catch {
    return [];
  }
}

function writeLines(lines: string[]) {
  const file = ignoreFilePath();
  if (!file) return;
  fs.writeFileSync(file, lines.join("\n").replace(/\n*$/, "\n"));
}

function targetUris(uri?: vscode.Uri, selected?: vscode.Uri[]): vscode.Uri[] {
  if (selected?.length) return selected;
  if (uri) return [uri];
  const active = vscode.window.activeTextEditor?.document.uri;
  return active ? [active] : [];
}

function rulesChanged() {
  invalidateIgnoreMatcher();
  const root = workspaceRoot();
  const hiddenPaths = readManualRules()
    .filter((rule) => rule.startsWith("/"))
    .map((rule) => (root ? path.join(root.uri.fsPath, rule.slice(1)) : rule));
  vscode.commands.executeCommand("setContext", "liveCoding.hiddenPaths", hiddenPaths);
  decorationsChanged.fire(undefined);
  onRulesChanged();
}

function describe(count: number, uris: vscode.Uri[]): string {
  return count === 1 ? path.basename(uris[0].fsPath) : `${count} item`;
}

async function hide(uri?: vscode.Uri, selected?: vscode.Uri[]) {
  const uris = targetUris(uri, selected).filter((u) => toRule(u));
  if (uris.length === 0) {
    vscode.window.showWarningMessage("Pilih file atau folder di dalam project.");
    return;
  }

  const lines = readLines();
  if (lines.every((line) => !line.trim())) lines.splice(0, lines.length, HEADER);
  const existing = new Set(lines.map((line) => line.trim()));
  for (const u of uris) {
    const rule = toRule(u)!;
    if (!existing.has(rule)) lines.push(rule);
  }
  writeLines(lines);
  rulesChanged();
  vscode.window.showInformationMessage(`${describe(uris.length, uris)} disembunyikan dari mahasiswa.`);
}

async function show(uri?: vscode.Uri, selected?: vscode.Uri[]) {
  const uris = targetUris(uri, selected).filter((u) => toRule(u));
  if (uris.length === 0) return;

  const rules = new Set(uris.map((u) => toRule(u)!));
  const lines = readLines();
  const remaining = lines.filter((line) => !rules.has(line.trim()));
  if (remaining.length !== lines.length) {
    writeLines(remaining);
    rulesChanged();
  }

  const stillHidden = uris.filter((u) => createIgnoreMatcher().ignores(relativePath(u)!));
  if (stillHidden.length === 0) {
    vscode.window.showInformationMessage(`${describe(uris.length, uris)} ditampilkan ke mahasiswa.`);
    return;
  }

  const choice = await vscode.window.showWarningMessage(
    `${describe(stillHidden.length, stillHidden)} masih tersembunyi karena aturan lain: folder induknya disembunyikan, ` +
      `termasuk daftar bawaan (misalnya .env, build, node_modules), atau setting liveCoding.exclude.`,
    `Buka ${IGNORE_FILE}`,
  );
  const file = ignoreFilePath();
  if (choice && file && fs.existsSync(file)) {
    vscode.window.showTextDocument(vscode.Uri.file(file));
  }
}

export function registerHiddenFiles(context: vscode.ExtensionContext, onChanged: () => void) {
  onRulesChanged = onChanged;

  const decorations: vscode.FileDecorationProvider = {
    onDidChangeFileDecorations: decorationsChanged.event,
    provideFileDecoration(uri) {
      const rel = relativePath(uri);
      if (!rel || !createManualMatcher().ignores(rel)) return;
      return new vscode.FileDecoration("⊘", "Disembunyikan dari mahasiswa", new vscode.ThemeColor("disabledForeground"));
    },
  };

  const disposables: vscode.Disposable[] = [
    decorationsChanged,
    vscode.window.registerFileDecorationProvider(decorations),
    vscode.commands.registerCommand("liveCoding.hideFromStudents", hide),
    vscode.commands.registerCommand("liveCoding.showToStudents", show),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("liveCoding.exclude")) rulesChanged();
    }),
  ];

  const root = workspaceRoot();
  if (root) {
    // Juga menangkap perubahan saat dosen mengedit .livecodingignore secara manual.
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, IGNORE_FILE));
    watcher.onDidChange(rulesChanged);
    watcher.onDidCreate(rulesChanged);
    watcher.onDidDelete(rulesChanged);
    disposables.push(watcher);
  }

  context.subscriptions.push(...disposables);
  rulesChanged();
}
