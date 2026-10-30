import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon.jsx";

// Penanda ala dekorasi git di Explorer VS Code: teks berwarna di kanan, bukan pil.
const MARKS = {
  new: ["new", "Baru"],
  modified: ["modified", "Diubah"],
};

function folderHasChanges(folderPath, changes) {
  const prefix = `${folderPath}/`;
  return Object.keys(changes).some((path) => path.startsWith(prefix));
}

function TreeNode({ node, depth, selectedFile, activeFile, flashFiles, changes, onSelectFile }) {
  const [expanded, setExpanded] = useState(false);
  const rowRef = useRef(null);
  const pad = { paddingLeft: 8 + depth * 12 };
  const isFolder = node.type === "folder";
  // Folder yang memuat file terpilih dibuka sendiri, supaya file yang dibuka dosen terlihat di tree.
  const holdsSelection = isFolder && Boolean(selectedFile) && selectedFile.startsWith(`${node.path}/`);

  useEffect(() => {
    if (holdsSelection) setExpanded(true);
  }, [holdsSelection, selectedFile]);

  const isSelected = !isFolder && selectedFile === node.path;

  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [isSelected]);

  if (isFolder) {
    const changed = folderHasChanges(node.path, changes);
    return (
      <>
        <button
          type="button"
          ref={rowRef}
          className={["lc-tree__row", changed && "is-modified"].filter(Boolean).join(" ")}
          style={pad}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}>
          <Icon name={expanded ? "chevron-down" : "chevron-right"} className="lc-tree__chev" />
          <Icon name="folder" className="lc-tree__icon" />
          <span className="lc-tree__name">{node.name}</span>
          {changed && <i className="lc-tree__dot" title="Ada file yang berubah" />}
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

  const mark = MARKS[changes[node.path]];
  const isTeacherFile = activeFile === node.path;
  const flashing = flashFiles.has(node.path);
  const classes = ["lc-tree__row", isSelected && "is-selected", mark && `is-${mark[0]}`];

  return (
    <button
      type="button"
      ref={rowRef}
      className={classes.filter(Boolean).join(" ")}
      style={pad}
      title={node.path}
      onClick={() => onSelectFile(node.path)}>
      <span className="lc-tree__chev" />
      <Icon name="file" className="lc-tree__icon" />
      <span className="lc-tree__name">{node.name}</span>
      {flashing && <i className="lc-tree__pulse" title="Baru saja disimpan" />}
      {isTeacherFile && <span className="lc-tree__mark lc-tree__mark--teacher">Dosen</span>}
      {mark && <span className="lc-tree__mark">{mark[1]}</span>}
    </button>
  );
}

export default function FileTree({ nodes, changeCount, changeHint, ...rest }) {
  return (
    <nav className="lc-explorer" aria-label="File project">
      <div className="lc-explorer__head">
        <span>File project</span>
        {changeCount > 0 && (
          <span className="lc-explorer__count" title={changeHint}>
            {changeCount} berubah
          </span>
        )}
      </div>
      {nodes && nodes.length > 0 ? (
        <div className="lc-tree">
          {nodes.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} {...rest} />
          ))}
        </div>
      ) : (
        <p className="lc-explorer__empty">Belum ada struktur project.</p>
      )}
    </nav>
  );
}
