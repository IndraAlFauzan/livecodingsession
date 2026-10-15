import { useState } from "react";

const CHANGE_LABEL = { new: "Baru", modified: "Diubah" };

function folderHasChanges(folderPath, changes) {
  const prefix = `${folderPath}/`;
  return Object.keys(changes).some((path) => path.startsWith(prefix));
}

export default function FileNode({ node, selectedFile, activeFile, flashFiles, changes, onSelectFile }) {
  const [expanded, setExpanded] = useState(false);

  if (node.type === "folder") {
    return (
      <div className="node">
        <button className="tree-row folder-row" onClick={() => setExpanded((value) => !value)}>
          <span className="chevron">{expanded ? "▾" : "▸"}</span>
          <span className="icon">{expanded ? "📂" : "📁"}</span>
          <span className="node-name">{node.name}</span>
          {folderHasChanges(node.path, changes) && <span className="folder-change" title="Ada file yang berubah" />}
        </button>

        {expanded && (
          <div className="children">
            {(node.children || []).map((child) => (
              <FileNode
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                activeFile={activeFile}
                flashFiles={flashFiles}
                changes={changes}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const change = changes[node.path];
  const classes = ["tree-row", "file-row"];
  if (selectedFile === node.path) classes.push("selected");
  if (activeFile === node.path) classes.push("active");
  if (flashFiles.has(node.path)) classes.push("changed");

  return (
    <button className={classes.join(" ")} onClick={() => onSelectFile(node.path)} title={node.path}>
      <span className="chevron"></span>
      <span className="icon">📄</span>
      <span className="node-name">{node.name}</span>
      {change && <span className={`change-badge ${change}`}>{CHANGE_LABEL[change]}</span>}
      {activeFile === node.path && <span className="badge">LIVE</span>}
      {flashFiles.has(node.path) && <span className="dot" />}
    </button>
  );
}
