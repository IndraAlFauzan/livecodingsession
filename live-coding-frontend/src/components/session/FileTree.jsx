import { useState } from "react";
import Badge from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";
import Icon from "../ui/Icon.jsx";

function folderHasChanges(folderPath, changes) {
  const prefix = `${folderPath}/`;
  return Object.keys(changes).some((path) => path.startsWith(prefix));
}

function TreeNode({ node, depth, selectedFile, activeFile, flashFiles, changes, onSelectFile }) {
  // Terbuka secara bawaan supaya badge Dosen, Baru dan Diubah langsung terlihat.
  const [expanded, setExpanded] = useState(true);
  const pad = { paddingLeft: 8 + depth * 16 };

  if (node.type === "folder") {
    return (
      <>
        <button
          type="button"
          className="lc-tree__row"
          style={pad}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}>
          <Icon name={expanded ? "chevron-down" : "chevron-right"} className="lc-tree__chev" />
          <Icon name="folder" />
          <span className="lc-tree__name">{node.name}</span>
          {folderHasChanges(node.path, changes) && (
            <i className="lc-badge__dot" style={{ color: "var(--amber)" }} title="Ada file yang berubah" />
          )}
        </button>

        {expanded &&
          (node.children || []).map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              activeFile={activeFile}
              flashFiles={flashFiles}
              changes={changes}
              onSelectFile={onSelectFile}
            />
          ))}
      </>
    );
  }

  const change = changes[node.path];
  const isTeacherFile = activeFile === node.path;
  const flashing = flashFiles.has(node.path);

  return (
    <button
      type="button"
      className={["lc-tree__row", selectedFile === node.path && "is-selected"].filter(Boolean).join(" ")}
      style={pad}
      title={node.path}
      onClick={() => onSelectFile(node.path)}>
      <span style={{ width: 14 }} />
      <Icon name="file" />
      <span className="lc-tree__name">{node.name}</span>
      {change && <Badge status={change} size="sm" />}
      {isTeacherFile && <Badge status="teacher" size="sm" />}
      {flashing && <i className="lc-tree__pulse" title="Baru saja disimpan" />}
    </button>
  );
}

export default function FileTree({ nodes, changeCount, changeHint, ...rest }) {
  return (
    <Card
      title="File project"
      icon="folder"
      actions={
        changeCount > 0 ? (
          <span title={changeHint}>
            <Badge tone="amber" size="sm">
              {changeCount} berubah
            </Badge>
          </span>
        ) : null
      }>
      {nodes && nodes.length > 0 ? (
        <div className="lc-tree">
          {nodes.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} changes={rest.changes} {...rest} />
          ))}
        </div>
      ) : (
        <p className="lc-muted" style={{ margin: 0 }}>
          Belum ada struktur project.
        </p>
      )}
    </Card>
  );
}
