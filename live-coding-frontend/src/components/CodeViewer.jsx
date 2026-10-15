import Editor from "@monaco-editor/react";

export default function CodeViewer({ path, file }) {
  if (!path) {
    return (
      <div className="code-viewer">
        <div className="code-header">
          <span>Tidak ada file dipilih</span>
        </div>
        <div className="empty-editor">Pilih file dari sidebar untuk melihat kode.</div>
      </div>
    );
  }

  if (file?.type === "asset") {
    return (
      <div className="code-viewer">
        <div className="code-header">
          <span>{path}</span>
          <span className="language-label">asset</span>
        </div>
        <div className="asset-placeholder">
          <div className="asset-icon">🖼️</div>
          <h2>File aset</h2>
          <p>Pratinjau file gambar/media belum tersedia.</p>
          <code>{path}</code>
        </div>
      </div>
    );
  }

  const language = file?.language || "plaintext";

  return (
    <div className="code-viewer">
      <div className="code-header">
        <span>{path}</span>
        <span className="language-label">{language}</span>
      </div>

      {file ? (
        <Editor
          height="100%"
          language={language}
          value={file.content || ""}
          theme="vs-dark"
          options={{
            readOnly: true,
            domReadOnly: true,
            contextmenu: false,
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            copyWithSyntaxHighlighting: false,
          }}
        />
      ) : (
        <div className="empty-editor">Memuat file...</div>
      )}
    </div>
  );
}
