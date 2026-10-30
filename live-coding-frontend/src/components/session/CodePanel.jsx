import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import Icon from "../ui/Icon.jsx";

function highlightLabel(highlights) {
  const start = Math.min(...highlights.map((h) => h.startLine));
  // Seleksi baris penuh di VS Code berakhir di kolom 1 baris berikutnya.
  const end = Math.max(...highlights.map((h) => (h.endColumn === 1 && h.endLine > h.startLine ? h.endLine - 1 : h.endLine)));
  return start === end ? `baris ${start}` : `baris ${start}–${end}`;
}

// Tema Monaco dibangun dari token code-* dan syn-* yang sedang berlaku.
function defineTheme(monaco) {
  const style = getComputedStyle(document.documentElement);
  const token = (name) => style.getPropertyValue(name).trim();
  const bare = (name) => token(name).replace("#", "");

  monaco.editor.defineTheme("lcc-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: bare("--on-code") },
      { token: "comment", foreground: bare("--on-code-muted"), fontStyle: "italic" },
      { token: "keyword", foreground: bare("--syn-keyword") },
      { token: "keyword.json", foreground: bare("--syn-keyword") },
      { token: "tag", foreground: bare("--syn-keyword") },
      { token: "string", foreground: bare("--syn-string") },
      { token: "string.yaml", foreground: bare("--syn-string") },
      { token: "number", foreground: bare("--syn-number") },
      { token: "constant", foreground: bare("--syn-number") },
      { token: "type", foreground: bare("--syn-type") },
      { token: "type.identifier", foreground: bare("--syn-type") },
      { token: "attribute.name", foreground: bare("--syn-type") },
      { token: "function", foreground: bare("--syn-function") },
      { token: "identifier.function", foreground: bare("--syn-function") },
      { token: "entity.name.function", foreground: bare("--syn-function") },
    ],
    colors: {
      "editor.background": token("--code-bg"),
      "editor.foreground": token("--on-code"),
      "editorGutter.background": token("--code-bg"),
      "editorLineNumber.foreground": token("--on-code-muted"),
      "editorLineNumber.activeForeground": token("--on-code"),
      "editor.lineHighlightBackground": token("--code-panel"),
      "editor.lineHighlightBorder": token("--code-panel"),
      "editorWidget.background": token("--code-panel"),
      "editorWidget.border": token("--code-line"),
      "editorIndentGuide.background": token("--code-line"),
      "editorIndentGuide.activeBackground": token("--code-line"),
      "scrollbarSlider.background": token("--code-line"),
      "scrollbarSlider.hoverBackground": token("--code-line"),
      "scrollbarSlider.activeBackground": token("--code-ruler"),
    },
  });
}

function Shell({ path, language, highlights, children }) {
  return (
    <section className="lc-codepanel lc-session__panel">
      <div className="lc-codepanel__tabs">
        <span className="lc-codepanel__tab is-active">
          <Icon name="file" />
          {path ? path.split("/").pop() : "Tidak ada file dipilih"}
        </span>
      </div>
      <div className="lc-codepanel__bar">
        <span className="lc-codepanel__path">{path || "Tidak ada file dipilih"}</span>
        {highlights?.length > 0 && (
          <span className="lc-codepanel__hl">
            <i />
            {`Disorot dosen · ${highlightLabel(highlights)}`}
          </span>
        )}
        {language && <span className="lc-codepanel__lang">{language}</span>}
      </div>
      {children}
    </section>
  );
}

export default function CodePanel({ path, file, highlights, followHighlights }) {
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

    const ruler = getComputedStyle(document.documentElement).getPropertyValue("--code-ruler").trim();
    const ranges = (highlights || []).map(
      (h) => new monaco.Range(h.startLine, h.startColumn, h.endLine, h.endColumn),
    );
    decorationsRef.current.set(
      ranges.map((range) => ({
        range,
        options: {
          className: "lcc-highlight",
          linesDecorationsClassName: "lcc-highlight-margin",
          overviewRuler: { color: ruler, position: monaco.editor.OverviewRulerLane.Full },
        },
      })),
    );
    if (followHighlights && ranges.length) editorRef.current.revealRangeInCenterIfOutsideViewport(ranges[0]);
  }, [editorReady, highlights, content, followHighlights]);

  if (!path) {
    return (
      <Shell>
        <div className="lc-codepanel__empty">Pilih file dari daftar File project untuk melihat kode.</div>
      </Shell>
    );
  }

  if (file?.type === "asset") {
    return (
      <Shell path={path} language="asset">
        <div className="lc-codepanel__asset">
          <strong>File aset</strong>
          <p>Pratinjau file gambar/media belum tersedia.</p>
          <code>{path}</code>
        </div>
      </Shell>
    );
  }

  const language = file?.language || "plaintext";

  return (
    <Shell path={path} language={language} highlights={highlights}>
      {file ? (
        <div className="lc-codepanel__editor">
          <Editor
            height="100%"
            language={language}
            value={content || ""}
            theme="lcc-dark"
            beforeMount={defineTheme}
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
        </div>
      ) : (
        <div className="lc-codepanel__empty">Memuat file...</div>
      )}
    </Shell>
  );
}
