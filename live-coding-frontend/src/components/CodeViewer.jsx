import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

function highlightLabel(highlights) {
  const start = Math.min(...highlights.map((h) => h.startLine));
  // Seleksi baris penuh di VS Code berakhir di kolom 1 baris berikutnya.
  const end = Math.max(...highlights.map((h) => (h.endColumn === 1 && h.endLine > h.startLine ? h.endLine - 1 : h.endLine)));
  return start === end ? `baris ${start}` : `baris ${start}–${end}`;
}

export default function CodeViewer({ path, file, highlights, followHighlights }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection();
    editor.onDidDispose(() => {
      editorRef.current = null;
      decorationsRef.current = null;
      setEditorReady(false);
    });
    setEditorReady(true);
  }

  const content = file?.content;

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!editorReady || !decorationsRef.current || !monaco) return;

    const ranges = (highlights || []).map(
      (h) => new monaco.Range(h.startLine, h.startColumn, h.endLine, h.endColumn),
    );
    decorationsRef.current.set(
      ranges.map((range) => ({
        range,
        options: {
          className: "teacher-selection",
          overviewRuler: { color: "#facc15", position: monaco.editor.OverviewRulerLane.Full },
        },
      })),
    );
    if (followHighlights && ranges.length) editorRef.current.revealRangeInCenterIfOutsideViewport(ranges[0]);
  }, [editorReady, highlights, content, followHighlights]);

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
        <div className="code-header-meta">
          {highlights?.length > 0 && <span className="highlight-label">Disorot dosen: {highlightLabel(highlights)}</span>}
          <span className="language-label">{language}</span>
        </div>
      </div>

      {file ? (
        <Editor
          height="100%"
          language={language}
          value={content || ""}
          theme="vs-dark"
          onMount={handleMount}
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
