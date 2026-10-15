import * as fs from "fs";
import * as path from "path";
import ignore from "ignore";
import { FileNode } from "./types";

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function shouldIgnore(relativePath: string, matcher: ReturnType<typeof ignore>): boolean {
  if (!relativePath) return false;
  return matcher.ignores(toPosixPath(relativePath));
}

export function buildFileTree(rootPath: string, matcher: ReturnType<typeof ignore>): FileNode[] {
  function walk(currentPath: string): FileNode | null {
    const relativePath = toPosixPath(path.relative(rootPath, currentPath));

    if (shouldIgnore(relativePath, matcher)) {
      return null;
    }

    const stat = fs.statSync(currentPath);
    const name = path.basename(currentPath);

    if (stat.isDirectory()) {
      const children = fs
        .readdirSync(currentPath)
        .map((child) => walk(path.join(currentPath, child)))
        .filter((node): node is FileNode => Boolean(node))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      return {
        name,
        path: relativePath,
        type: "folder",
        children,
      };
    }

    if (stat.isFile()) {
      return {
        name,
        path: relativePath,
        type: "file",
      };
    }

    return null;
  }

  return fs
    .readdirSync(rootPath)
    .map((child) => walk(path.join(rootPath, child)))
    .filter((node): node is FileNode => Boolean(node));
}
