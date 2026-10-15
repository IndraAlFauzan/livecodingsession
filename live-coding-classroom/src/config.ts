import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import ignore, { Ignore } from "ignore";

export const IGNORE_FILE = ".livecodingignore";

// Selalu dipakai; setting liveCoding.exclude hanya menambah pola.
const BUILT_IN_EXCLUDE = [
  // dependency & hasil build
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  // Flutter / Dart / Android / iOS
  ".dart_tool",
  ".flutter-plugins",
  ".flutter-plugins-dependencies",
  ".gradle",
  "android/.gradle",
  "ios/Pods",
  "ios/.symlinks",
  // Laravel
  "storage/logs",
  "storage/framework",
  "bootstrap/cache",
  "public/build",
  // editor
  ".idea",
  ".vscode",
  ".DS_Store",
  // berisi nama file yang disembunyikan dosen
  IGNORE_FILE,
  // rahasia & data lokal
  ".env",
  ".env.*",
  "!.env.example",
  "*.keystore",
  "*.jks",
  "key.properties",
  "*.pem",
  "*.log",
  "*.sqlite",
  "*.sqlite3",
  // arsip
  "*.zip",
  "*.tar",
  "*.gz",
  "*.rar",
];

export function getConfig() {
  const config = vscode.workspace.getConfiguration("liveCoding");
  const extraExclude = config.get<string[]>("exclude", []);

  return {
    backendUrl: config.get<string>("backendUrl", "ws://localhost:3000").replace(/\/$/, ""),
    teacherToken: config.get<string>("teacherToken", "dev-secret-token"),
    exclude: [...BUILT_IN_EXCLUDE, ...extraExclude],
    maxFileSizeKb: config.get<number>("maxFileSizeKb", 512),
  };
}

export function getHttpBaseUrl(): string {
  return getConfig().backendUrl.replace(/^ws/, "http");
}

let cachedMatcher: Ignore | null = null;
let cachedManualMatcher: Ignore | null = null;

export function workspaceRoot(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

export function ignoreFilePath(): string | undefined {
  const root = workspaceRoot();
  return root ? path.join(root.uri.fsPath, IGNORE_FILE) : undefined;
}

export function readManualRules(): string[] {
  const file = ignoreFilePath();
  if (!file) return [];
  try {
    return fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

export function invalidateIgnoreMatcher() {
  cachedMatcher = null;
  cachedManualMatcher = null;
}

export function createIgnoreMatcher(): Ignore {
  cachedMatcher ??= ignore().add(getConfig().exclude).add(readManualRules());
  return cachedMatcher;
}

export function createManualMatcher(): Ignore {
  cachedManualMatcher ??= ignore().add(readManualRules());
  return cachedManualMatcher;
}
