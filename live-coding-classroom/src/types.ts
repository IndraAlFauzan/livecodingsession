export type FileNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
};

export type SocketPayload = {
  type: string;
  sessionId?: string;
  [key: string]: unknown;
};
