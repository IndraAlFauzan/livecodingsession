import { useState } from "react";

export default function FileNode({
  node,
  selectedFile,
  activeFile,
  changedFiles,
  onSelectFile,
}) {
  const [expanded, setExpanded] = useState(false);
  const isFolder = node.type === "folder";
  const isSelected = selectedFile === node.path;
  const isActive = activeFile === node.path;
  const isChanged = changedFiles?.has(node.path);

  if (isFolder) {
    return (
      <div className="node">
        <button
          className="tree-row folder-row"
          onClick={() => setExpanded((value) => !value)}>
          <span className="chevron">{expanded ? "▾" : "▸"}</span>
          <span className="icon">{expanded ? "📂" : "📁"}</span>
          <span className="node-name">{node.name}</span>
        </button>

        {expanded && (
          <div className="children">
            {(node.children || []).map((child) => (
              <FileNode
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                activeFile={activeFile}
                changedFiles={changedFiles}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={[
        "tree-row",
        "file-row",
        isSelected ? "selected" : "",
        isActive ? "active" : "",
        isChanged ? "changed" : "",
      ].join(" ")}
      onClick={() => onSelectFile(node.path)}
      title={node.path}>
      <span className="chevron"></span>
      <span className="icon">📄</span>
      <span className="node-name">{node.name}</span>
      {isActive && <span className="badge">LIVE</span>}
      {isChanged && <span className="dot" />}
    </button>
  );
}
