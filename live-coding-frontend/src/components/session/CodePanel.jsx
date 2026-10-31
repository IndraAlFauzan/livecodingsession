import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import Segmented from "../ui/Segmented.jsx";
import { storage } from "../../lib/storage.js";
import { isMarkdown, renderMarkdown } from "../../utils/markdown.jsx";
import Icon from "../ui/Icon.jsx";

function highlightLabel(highlights) {
  const start = Math.min(...highlights.map((h) => h.startLine));
  // Seleksi baris penuh di VS Code berakhir di kolom 1 baris berikutnya.
  const end = Math.max(...highlights.map((h) => (h.endColumn === 1 && h.endLine > h.startLine ? h.endLine - 1 : h.endLine)));
  return start === end ? `baris ${start}` : `baris ${start}–${end}`;
}

function monoFont() {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
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
      "editorStickyScroll.background": token("--code-bg"),
      "editorStickyScrollHover.background": token("--code-panel"),
      "editorStickyScroll.border": token("--code-line"),
      "editorStickyScroll.shadow": token("--code-bg"),
      "scrollbarSlider.background": token("--code-line"),
      "scrollbarSlider.hoverBackground": token("--code-line"),
      "scrollbarSlider.activeBackground": token("--code-ruler"),
    },
  });
}

// Fungsi, bukan konstanta: monoFont() membaca CSS variable, dan saat modul
// dievaluasi stylesheet-nya bisa belum termuat -- fontnya akan diam-diam jatuh
// ke bawaan Monaco.
function editorOptions() {
  return {
    readOnly: true,
    domReadOnly: true,
    contextmenu: false,
    minimap: { enabled: false },
    fontFamily: monoFont(),
    fontSize: 14,
    lineHeight: 21,
    wordWrap: "on",
    scrollBeyondLastLine: false,
    copyWithSyntaxHighlighting: false,
  };
}

function Shell({ path, highlights, actions, children }) {
  const segments = path ? path.split("/") : [];
  return (
    <section className="lc-codepanel lc-session__panel">
      <div className="lc-codepanel__tabs">
        {path && (
          <span className="lc-codepanel__tab is-active">
            <Icon name="file" />
            {segments[segments.length - 1]}
          </span>
        )}
      </div>
      {path && (
        <div className="lc-codepanel__bar">
          <span className="lc-codepanel__path" title={path}>
            {segments.map((segment, index) => (
              <span key={index}>
                {index > 0 && <Icon name="chevron-right" className="lc-codepanel__sep" />}
                {segment}
              </span>
            ))}
          </span>
          {highlights?.length > 0 && (
            <span className="lc-codepanel__hl">
              <i />
              {`Disorot dosen · ${highlightLabel(highlights)}`}
            </span>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export default function CodePanel({ path, file, highlights, followHighlights }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);
  const [lihatSumber, setLihatSumber] = useState(() => storage.getMarkdownSource());

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection();
    // Monaco mengukur lebar karakter saat mount; ukur ulang setelah JetBrains Mono selesai dimuat.
    document.fonts?.ready.then(() => monaco.editor.remeasureFonts());
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
      <Shell path={path}>
        <div className="lc-codepanel__asset">
          <strong>File aset</strong>
          <p>Pratinjau file gambar/media belum tersedia.</p>
          <code>{path}</code>
        </div>
      </Shell>
    );
  }

  const language = file?.language || "plaintext";

  // README dirender sebagai bacaan, bukan kode. Pratinjau jadi tampilan awal
  // karena itu yang dicari saat dosen membuka README; sumbernya tetap sejauh
  // satu klik, dan pilihannya diingat per perangkat.
  if (isMarkdown(file)) {
    const pilih = (
      <Segmented
        items={[{ label: "Pratinjau" }, { label: "Kode" }]}
        value={lihatSumber ? 1 : 0}
        onChange={(index) => {
          const sumber = index === 1;
          setLihatSumber(sumber);
          storage.setMarkdownSource(sumber);
        }}
        label="Tampilan README"
      />
    );

    if (!lihatSumber) {
      return (
        <Shell path={path} highlights={highlights} actions={pilih}>
          <div className="lc-md">{renderMarkdown(content)}</div>
        </Shell>
      );
    }

    return (
      <Shell path={path} highlights={highlights} actions={pilih}>
        <div className="lc-codepanel__editor">
          <Editor
            height="100%"
            language="markdown"
            value={content || ""}
            theme="lcc-dark"
            beforeMount={defineTheme}
            onMount={handleMount}
            options={editorOptions()}
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell path={path} highlights={highlights}>
      {file ? (
        <div className="lc-codepanel__editor">
          <Editor
            height="100%"
            language={language}
            value={content || ""}
            theme="lcc-dark"
            beforeMount={defineTheme}
            onMount={handleMount}
            options={editorOptions()}
          />
        </div>
      ) : (
        <div className="lc-codepanel__empty">Memuat file...</div>
      )}
    </Shell>
  );
}
