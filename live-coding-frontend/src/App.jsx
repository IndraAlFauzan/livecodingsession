import { useEffect, useMemo, useRef, useState } from "react";
import FileTree from "./components/FileTree.jsx";
import CodeViewer from "./components/CodeViewer.jsx";
import StatusBar from "./components/StatusBar.jsx";
import { WS_URL } from "./config.js";
import { getSessionIdFromUrl } from "./utils/session.js";
import { sortTree } from "./utils/tree.js";

export default function App() {
  const sessionId = useMemo(() => getSessionIdFromUrl(), []);
  const socketRef = useRef(null);

  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [projectName, setProjectName] = useState("Live Coding Classroom");
  const [tree, setTree] = useState([]);
  const [files, setFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [followTeacher, setFollowTeacher] = useState(false);
  const [changedFiles, setChangedFiles] = useState(new Set());
  const [lastError, setLastError] = useState(null);

  const filesRef = useRef(files);
  const followTeacherRef = useRef(followTeacher);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    followTeacherRef.current = followTeacher;
  }, [followTeacher]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      setLastError(null);

      ws.send(
        JSON.stringify({
          type: "student:join",
          sessionId,
        }),
      );
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
    };

    ws.onerror = () => {
      setConnectionStatus("error");
      setLastError("Tidak bisa terhubung ke backend WebSocket.");
    };

    ws.onmessage = (event) => {
      let message;

      try {
        message = JSON.parse(event.data);
        setLastError(null);
      } catch {
        setLastError("Pesan dari backend bukan JSON valid.");
        return;
      }

      switch (message.type) {
        case "session:init": {
          setProjectName(message.projectName || "Live Coding Classroom");
          setTree(sortTree(message.tree || []));
          setActiveFile(message.activeFile || null);
          break;
        }

        case "tree:update": {
          setTree(sortTree(message.tree || []));
          break;
        }

        case "file:content":
        case "file:create":
        case "file:update": {
          if (!message.path) break;

          setFiles((prev) => ({
            ...prev,
            [message.path]: {
              type: "text",
              content: message.content || "",
              language: message.language || "plaintext",
              updatedAt: message.updatedAt || new Date().toISOString(),
            },
          }));

          markChanged(message.path);
          break;
        }

        case "asset:metadata":
        case "asset:content": {
          if (!message.path) break;

          setFiles((prev) => ({
            ...prev,
            [message.path]: {
              type: "asset",
              assetType: message.assetType || "binary",
              updatedAt: message.updatedAt || new Date().toISOString(),
            },
          }));

          markChanged(message.path);
          break;
        }

        case "file:delete": {
          setFiles((prev) => {
            const next = { ...prev };
            delete next[message.path];
            return next;
          });

          setSelectedFile((prev) => {
            if (prev === message.path) return null;
            return prev;
          });

          break;
        }

        case "teacher:active-file": {
          const path = message.path || null;

          setActiveFile(path);

          if (followTeacherRef.current && path) {
            setSelectedFile(path);

            if (!filesRef.current[path]) {
              requestFile(path);
            }
          }

          break;
        }

        case "teacher:disconnected": {
          setLastError("Dosen terputus dari session.");
          break;
        }

        case "error": {
          setLastError(message.message || "Backend mengirim error.");
          break;
        }

        default:
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  function markChanged(path) {
    setChangedFiles((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });

    window.setTimeout(() => {
      setChangedFiles((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }, 1800);
  }

  function requestFile(path) {
    const ws = socketRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        type: "file:request",
        sessionId,
        path,
      }),
    );
  }

  function openFile(path) {
    setSelectedFile(path);

    if (!filesRef.current[path]) {
      requestFile(path);
    }
  }

  const currentFile = selectedFile ? files[selectedFile] : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>{projectName}</h1>
          <p>Mode mahasiswa: view-only real-time</p>
        </div>

        <div className="topbar-actions">
          <label className="follow-toggle">
            <input
              type="checkbox"
              checked={followTeacher}
              onChange={(event) => setFollowTeacher(event.target.checked)}
            />
            Follow Dosen
          </label>
        </div>
      </header>

      {lastError && (
        <div className="alert">
          <span>{lastError}</span>
          <button onClick={() => setLastError(null)}>Tutup</button>
        </div>
      )}

      <main className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <strong>Explorer</strong>
            <small>{tree.length} item</small>
          </div>

          <FileTree
            nodes={tree}
            selectedFile={selectedFile}
            activeFile={activeFile}
            changedFiles={changedFiles}
            onSelectFile={openFile}
          />
        </aside>

        <section className="editor-panel">
          <CodeViewer
            path={selectedFile}
            content={currentFile?.content || ""}
            language={currentFile?.language || "plaintext"}
            file={currentFile}
          />
        </section>
      </main>

      <StatusBar
        connectionStatus={connectionStatus}
        sessionId={sessionId}
        activeFile={activeFile}
      />
    </div>
  );
}
