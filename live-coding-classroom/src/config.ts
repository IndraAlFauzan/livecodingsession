import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import ignore, { Ignore } from "ignore";

export const IGNORE_FILE = ".livecodingignore";

// Nilai bawaan backendUrl. Dipakai juga untuk mengenali dosen yang belum
// mengarahkan extension-nya ke server kampus.
export const BACKEND_BAWAAN = "ws://localhost:3000";

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
  // editor & perkakas AI
  ".idea",
  ".vscode",
  ".DS_Store",
  ".claude",
  ".cursor",
  ".windsurf",
  ".aider*",
  ".continue",
  // .github sengaja TIDAK disembunyikan: workflow CI bukan rahasia, dan di
  // kelas RPL itu justru bahan ajar.
  // Python
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  // Rust / Java / Maven
  "target",
  ".m2",
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
  "*.key",
  "*.p12",
  "*.mobileprovision",
  "id_rsa*",
  "id_ed25519*",
  ".npmrc",
  ".netrc",
  ".ssh",
  ".aws",
  // kunci layanan: sering ada di proyek Flutter/Android/iOS
  "google-services.json",
  "GoogleService-Info.plist",
  "serviceAccount*.json",
  "secrets.*",
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
    backendUrl: config.get<string>("backendUrl", BACKEND_BAWAAN).replace(/\/$/, ""),
    teacherToken: config.get<string>("teacherToken", "dev-secret-token"),
    exclude: [...BUILT_IN_EXCLUDE, ...extraExclude],
    respectGitignore: config.get<boolean>("respectGitignore", true),
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

// Apa yang tidak masuk git biasanya memang tidak layak disiarkan: build, cache,
// kunci layanan. Daftar bawaan pasti ketinggalan zaman, sementara .gitignore
// proyek selalu mutakhir karena dosen memeliharanya sendiri.
//
// Aturan negasi (!...) sengaja dibuang. Di git, "!" membatalkan aturan
// sebelumnya; di sini pembatalan itu berarti membocorkan berkas yang mungkin
// justru ingin disembunyikan. Lebih aman menyembunyikan berlebih -- dosen bisa
// menampilkannya lagi lewat .livecodingignore.
export function readGitignoreRules(): string[] {
  const root = workspaceRoot();
  if (!root) return [];
  try {
    return fs
      .readFileSync(path.join(root.uri.fsPath, ".gitignore"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"));
  } catch {
    return [];
  }
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
  cachedMatcher ??= ignore()
    .add(getConfig().exclude)
    .add(getConfig().respectGitignore ? readGitignoreRules() : [])
    .add(readManualRules());
  return cachedMatcher;
}

export function createManualMatcher(): Ignore {
  cachedManualMatcher ??= ignore().add(readManualRules());
  return cachedManualMatcher;
}
