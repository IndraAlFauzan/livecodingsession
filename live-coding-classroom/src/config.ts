import * as vscode from "vscode";
import ignore from "ignore";

const DEFAULT_EXCLUDE = [
  "node_modules/**",
  "dist/**",
  "build/**",
  "out/**",
  "coverage/**",
  ".git/**",
  ".vscode/**",
];

export function getConfig() {
  const config = vscode.workspace.getConfiguration("liveCoding");

  return {
    backendUrl: config.get<string>("backendUrl", "ws://localhost:3000"),
    studentBaseUrl: config.get<string>(
      "studentBaseUrl",
      "http://localhost:5173/session",
    ),
    teacherToken: config.get<string>("teacherToken", "dev-secret-token"),
    exclude: config.get<string[]>("exclude", DEFAULT_EXCLUDE),
    maxFileSizeKb: config.get<number>("maxFileSizeKb", 512),
  };
}

export function createIgnoreMatcher() {
  const config = getConfig();
  return ignore().add(config.exclude);
}
