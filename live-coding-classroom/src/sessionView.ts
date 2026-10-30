import * as vscode from "vscode";

export type Viewer = { id: string; name: string; file: string | null; following: boolean };

export type SessionSnapshot = {
  phase: "idle" | "connecting" | "live" | "reconnecting";
  label: string | null;
  accessCode: string | null;
  studentUrl: string | null;
  viewers: Viewer[];
};

const EMPTY: SessionSnapshot = {
  phase: "idle",
  label: null,
  accessCode: null,
  studentUrl: null,
  viewers: [],
};

type Node =
  | { kind: "status" }
  | { kind: "code" }
  | { kind: "link" }
  | { kind: "viewersHead" }
  | { kind: "viewer"; viewer: Viewer }
  | { kind: "noViewer" };

// Panel sesi di Activity Bar. Jam sesi sengaja tidak di sini -- daftar tidak
// menyegarkan diri tiap detik; jam berjalan ada di status bar.
export class SessionView implements vscode.TreeDataProvider<Node> {
  private snapshot: SessionSnapshot = EMPTY;
  private changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;

  update(snapshot: SessionSnapshot) {
    this.snapshot = snapshot;
    this.changed.fire();
  }

  getChildren(parent?: Node): Node[] {
    if (parent) return [];
    const { phase, viewers } = this.snapshot;
    if (phase === "idle") return [];

    const nodes: Node[] = [{ kind: "status" }];
    if (phase === "live") {
      nodes.push({ kind: "code" }, { kind: "link" }, { kind: "viewersHead" });
      if (viewers.length === 0) nodes.push({ kind: "noViewer" });
      else nodes.push(...viewers.map((viewer) => ({ kind: "viewer" as const, viewer })));
    }
    return nodes;
  }

  getTreeItem(node: Node): vscode.TreeItem {
    const { phase, label, accessCode, studentUrl, viewers } = this.snapshot;

    if (node.kind === "status") {
      const text =
        phase === "connecting" ? "Menghubungkan..." : phase === "reconnecting" ? "Menyambung lagi..." : label || "Sesi live";
      const item = new vscode.TreeItem(text);
      item.description = phase === "live" ? "sedang live" : undefined;
      item.iconPath = new vscode.ThemeIcon(
        phase === "live" ? "broadcast" : phase === "reconnecting" ? "warning" : "sync~spin",
      );
      item.contextValue = "liveCoding.status";
      return item;
    }

    if (node.kind === "code") {
      const item = new vscode.TreeItem(accessCode || "-");
      item.description = "kode akses";
      item.iconPath = new vscode.ThemeIcon("key");
      item.tooltip = "Klik untuk menyalin kode akses";
      item.command = { command: "liveCoding.copyAccessCode", title: "Salin kode akses" };
      return item;
    }

    if (node.kind === "link") {
      const item = new vscode.TreeItem("Link mahasiswa");
      item.description = studentUrl ? "klik untuk menyalin" : undefined;
      item.iconPath = new vscode.ThemeIcon("link");
      item.command = { command: "liveCoding.copyStudentLink", title: "Salin link mahasiswa" };
      return item;
    }

    if (node.kind === "viewersHead") {
      const item = new vscode.TreeItem(
        `Menonton (${viewers.length})`,
        vscode.TreeItemCollapsibleState.None,
      );
      item.iconPath = new vscode.ThemeIcon("eye");
      return item;
    }

    if (node.kind === "noViewer") {
      const item = new vscode.TreeItem("Belum ada mahasiswa");
      item.iconPath = new vscode.ThemeIcon("circle-outline");
      return item;
    }

    const { viewer } = node;
    const item = new vscode.TreeItem(viewer.name);
    item.description = viewer.file ? viewer.file.split("/").pop() : "belum membuka file";
    item.tooltip = `${viewer.name}\n${viewer.file || "belum membuka file"}\n${
      viewer.following ? "Mengikuti dosen" : "Membuka file sendiri"
    }`;
    item.iconPath = new vscode.ThemeIcon(viewer.following ? "person" : "person-add");
    return item;
  }
}
