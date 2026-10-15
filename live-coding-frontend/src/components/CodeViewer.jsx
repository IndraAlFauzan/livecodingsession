import Editor from "@monaco-editor/react";

export default function CodeViewer({ path, content, language, file }) {
  function blockCopy(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  function blockKeyDown(event) {
    const key = event.key.toLowerCase();

    const isCopy = (event.metaKey || event.ctrlKey) && key === "c";
    const isCut = (event.metaKey || event.ctrlKey) && key === "x";
    const isSelectAll = (event.metaKey || event.ctrlKey) && key === "a";

    if (isCopy || isCut || isSelectAll) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  if (!path) {
    return (
      <div className="code-viewer">
        <div className="code-header">
          <span>Tidak ada file dipilih</span>
          <span className="language-badge">plaintext</span>
        </div>

        <div className="empty-editor">
          Pilih file dari sidebar untuk melihat kode.
        </div>
      </div>
    );
  }

  if (file?.type === "asset") {
    return (
      <div
        className="code-viewer"
        onCopy={blockCopy}
        onCut={blockCopy}
        onContextMenu={blockCopy}
        onKeyDown={blockKeyDown}>
        <div className="code-header">
          <span>{path}</span>
          <span className="language-badge">asset</span>
        </div>

        <div className="asset-placeholder">
          <div className="asset-icon">🖼️</div>
          <h2>Asset file</h2>
          <p>Preview asset belum tersedia.</p>
          <code>{path}</code>
        </div>
      </div>
    );
  }

  return (
    <div
      className="code-viewer"
      onCopy={blockCopy}
      onCut={blockCopy}
      onContextMenu={blockCopy}
      onKeyDown={blockKeyDown}>
      <div className="code-header">
        <span>{path}</span>
        <span className="language-badge">{language || "plaintext"}</span>
      </div>

      <Editor
        height="100%"
        language={language || "plaintext"}
        value={content || ""}
        theme="vs-dark"
        options={{
          readOnly: true,
          domReadOnly: true,
          contextmenu: false,
          minimap: {
            enabled: false,
          },
          fontSize: 14,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          copyWithSyntaxHighlighting: false,
        }}
      />
    </div>
  );
}
