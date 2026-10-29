import { useState } from "react";

const CHANGE_LABEL = { new: "Baru", modified: "Diubah" };

function FolderIcon({ open }) {
  return (
    <svg className="tree-icon" viewBox="0 0 16 16" aria-hidden="true">
      {open ? (
        <path d="M1.5 3.5h4l1.5 1.5h7.5v1.5H4.2L2.5 12.5h-1z M4.2 6.5h11.3l-2 6H2.5z" />
      ) : (
        <path d="M1.5 3.5h4l1.5 1.5h7.5v7.5h-13z" />
      )}
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="tree-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 1.5h6l3 3v10h-9z M9.5 1.5v3h3" />
    </svg>
  );
}

function folderHasChanges(folderPath, changes) {
  const prefix = `${folderPath}/`;
  return Object.keys(changes).some((path) => path.startsWith(prefix));
}

export default function FileNode({ node, selectedFile, activeFile, flashFiles, changes, onSelectFile }) {
  const [expanded, setExpanded] = useState(false);

  if (node.type === "folder") {
    return (
      <div className="node">
        <button className="tree-row folder-row" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          <span className="chevron" aria-hidden="true">
            {expanded ? "▾" : "▸"}
          </span>
          <FolderIcon open={expanded} />
          <span className="node-name">{node.name}</span>
          {folderHasChanges(node.path, changes) && (
            <span className="folder-change" title="Ada file yang berubah">
              <span className="visually-hidden">ada file yang berubah</span>
            </span>
          )}
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
      <span className="chevron" aria-hidden="true"></span>
      <FileIcon />
      <span className="node-name">{node.name}</span>
      {change && <span className={`change-badge ${change}`}>{CHANGE_LABEL[change]}</span>}
      {activeFile === node.path && <span className="badge">Dosen</span>}
      {flashFiles.has(node.path) && <span className="dot" title="Baru saja berubah" />}
    </button>
  );
}
