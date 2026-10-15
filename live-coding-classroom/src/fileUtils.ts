import * as vscode from "vscode";
import { getConfig, createIgnoreMatcher } from "./config";

const assetExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".pdf",
  ".mp4",
  ".mp3",
  ".wav",
];

export function normalizeRelativePath(uri: vscode.Uri): string {
  return vscode.workspace.asRelativePath(uri).replace(/\\/g, "/");
}

export function isIgnoredPath(relativePath: string): boolean {
  const matcher = createIgnoreMatcher();
  return matcher.ignores(relativePath.replace(/\\/g, "/"));
}

export function isAssetFile(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return assetExtensions.some((ext) => lower.endsWith(ext));
}

export async function canShareFile(uri: vscode.Uri): Promise<boolean> {
  const relativePath = normalizeRelativePath(uri);

  if (isIgnoredPath(relativePath)) {
    return false;
  }

  // Asset tetap muncul di tree, tapi tidak dikirim sebagai text/code.
  if (isAssetFile(relativePath)) {
    return false;
  }

  const config = getConfig();
  const stat = await vscode.workspace.fs.stat(uri);
  const maxBytes = config.maxFileSizeKb * 1024;

  if (stat.type !== vscode.FileType.File) {
    return false;
  }

  return stat.size <= maxBytes;
}

export async function readTextFile(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString("utf8");
}
