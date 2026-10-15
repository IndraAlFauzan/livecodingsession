import FileNode from "./FileNode.jsx";

export default function FileTree({ nodes, selectedFile, activeFile, changedFiles, onSelectFile }) {
  if (!nodes || nodes.length === 0) {
    return <div className="muted empty-tree">Belum ada struktur project.</div>;
  }

  return (
    <div className="file-tree">
      {nodes.map((node) => (
        <FileNode
          key={node.path}
          node={node}
          selectedFile={selectedFile}
          activeFile={activeFile}
          changedFiles={changedFiles}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
