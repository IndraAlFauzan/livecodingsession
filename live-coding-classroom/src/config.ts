import * as vscode from "vscode";
import ignore from "ignore";

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

export function createIgnoreMatcher() {
  return ignore().add(getConfig().exclude);
}
