import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AccessGate from "../components/AccessGate.jsx";
import CodeViewer from "../components/CodeViewer.jsx";
import FileTree from "../components/FileTree.jsx";
import ProtectedArea from "../components/ProtectedArea.jsx";
import StatusBar from "../components/StatusBar.jsx";
import { WS_URL } from "../config.js";
import Breadcrumb from "../components/Breadcrumb.jsx";
import PageShell from "../components/PageShell.jsx";
import StatusStamp from "../components/StatusStamp.jsx";
import { getCourseAccess, storage } from "../lib/storage.js";
import { sortTree } from "../utils/tree.js";

export default function MeetingPage() {
  const { slug, meetingId } = useParams();
  const [access, setAccess] = useState(() => getCourseAccess(slug));
  const [gateMessage, setGateMessage] = useState(null);

  if (!access) {
    return <AccessGate slug={slug} message={gateMessage} onSuccess={() => setAccess(getCourseAccess(slug))} />;
  }

  return (
    <MeetingViewer
      key={meetingId}
      slug={slug}
      meetingId={meetingId}
      access={access}
      onAccessRevoked={(message) => {
        storage.forgetCourse(slug);
        setGateMessage(message);
        setAccess(null);
      }}
    />
  );
}

function MeetingViewer({ slug, meetingId, access, onAccessRevoked }) {
  const socketRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [course, setCourse] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [hasTeacher, setHasTeacher] = useState(false);
  const [tree, setTree] = useState([]);
  const [files, setFiles] = useState({});
  const [changes, setChanges] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [teacherSelection, setTeacherSelection] = useState(null);
  const [followTeacher, setFollowTeacher] = useState(true);
  const [flashFiles, setFlashFiles] = useState(() => new Set());
  const [notice, setNotice] = useState(null);
  const [closedMessage, setClosedMessage] = useState(null);

  const filesRef = useRef(files);
  const selectedRef = useRef(selectedFile);
  const followRef = useRef(followTeacher);
  const revokeRef = useRef(onAccessRevoked);
  filesRef.current = files;
  selectedRef.current = selectedFile;
  followRef.current = followTeacher;
  revokeRef.current = onAccessRevoked;

  useEffect(() => {
    let ws;
    let retryTimer;
    let attempt = 0;
    let stopped = false;

    const requestFile = (path) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "file:request", meetingId, path }));
    };

    const flash = (path) => {
      setFlashFiles((prev) => new Set(prev).add(path));
      setTimeout(() => {
        setFlashFiles((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }, 1800);
    };

    const applyChange = (path, change) => {
      setChanges((prev) => {
        if (change === undefined || prev[path] === change) return prev;
        const next = { ...prev };
        if (change) next[path] = change;
        else delete next[path];
        return next;
      });
    };

    const handleMessage = (message) => {
      switch (message.type) {
        case "session:init": {
          setCourse(message.course);
          setMeeting(message.meeting);
          setHasTeacher(message.hasTeacher);
          setTree(sortTree(message.tree || []));
          setChanges(message.changes || {});
          setActiveFile(message.activeFile || null);
          setTeacherSelection(message.selection || null);
          setFiles({});
          setNotice(null);

          const target =
            followRef.current && message.hasTeacher && message.activeFile
              ? message.activeFile
              : selectedRef.current || message.activeFile;
          if (target) {
            setSelectedFile(target);
            requestFile(target);
          }
          break;
        }

        case "tree:update":
          setTree(sortTree(message.tree || []));
          break;

        case "file:content":
        case "file:create":
        case "file:update":
          setFiles((prev) => ({
            ...prev,
            [message.path]: { type: "text", content: message.content || "", language: message.language },
          }));
          applyChange(message.path, message.change);
          if (message.type !== "file:content") flash(message.path);
          break;

        case "asset:metadata":
        case "asset:content":
          setFiles((prev) => ({ ...prev, [message.path]: { type: "asset" } }));
          applyChange(message.path, message.change);
          break;

        case "file:delete":
          setFiles((prev) => {
            const next = { ...prev };
            delete next[message.path];
            return next;
          });
          applyChange(message.path, null);
          setSelectedFile((prev) => (prev === message.path ? null : prev));
          break;

        case "file:not-found":
          setFiles((prev) => ({ ...prev, [message.path]: { type: "text", content: "", language: "plaintext" } }));
          break;

        case "teacher:active-file":
          setActiveFile(message.path);
          if (followRef.current) {
            setSelectedFile(message.path);
            if (!filesRef.current[message.path]) requestFile(message.path);
          }
          break;

        case "teacher:selection":
          setTeacherSelection(message.selections?.length ? { path: message.path, selections: message.selections } : null);
          break;

        case "teacher:disconnected":
          setHasTeacher(false);
          setTeacherSelection(null);
          setMeeting((prev) => prev && { ...prev, status: "finished" });
          setNotice("Sesi live telah selesai. Kode terakhir tetap bisa kamu lihat.");
          break;

        case "meeting:closed":
          setClosedMessage(message.message);
          break;

        case "error":
          if (message.reason === "invalid_code") revokeRef.current(message.message);
          else if (message.reason === "unavailable") setClosedMessage(message.message);
          else setNotice(message.message);
          break;

        default:
          break;
      }
    };

    const connect = () => {
      setConnectionStatus("connecting");
      ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnectionStatus("connected");
        ws.send(JSON.stringify({ type: "student:join", meetingId, accessCode: access.code }));
      };

      ws.onmessage = (event) => {
        try {
          handleMessage(JSON.parse(event.data));
        } catch {
          // Abaikan pesan yang tidak bisa dibaca.
        }
      };

      ws.onclose = (event) => {
        setConnectionStatus("disconnected");
        if (stopped || event.code === 4003) return;
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 10000));
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [meetingId, access.code]);

  function openFile(path) {
    setSelectedFile(path);
    const ws = socketRef.current;
    if (!filesRef.current[path] && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "file:request", meetingId, path }));
    }
  }

  if (closedMessage) {
    return (
      <PageShell width="narrow">
        <section className="empty-state" role="alert">
          <p className="empty-title">{closedMessage}</p>
          <Link className="btn btn-primary" to={`/mk/${slug}`}>
            Kembali ke daftar pertemuan
          </Link>
        </section>
      </PageShell>
    );
  }

  const isLive = meeting?.status === "live" && hasTeacher;
  const courseName = course?.name || access.courseName;
  const watermark = `${access.studentName} · ${courseName} · ${new Date().toLocaleDateString("id-ID")}`;
  const changeCount = Object.keys(changes).length;
  const highlights = isLive && teacherSelection?.path === selectedFile ? teacherSelection.selections : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-info">
          <Breadcrumb
            tone="dark"
            items={[
              { label: "Beranda", to: "/" },
              { label: courseName, to: `/mk/${slug}` },
              { label: meeting ? `Pertemuan ${meeting.number}` : "Pertemuan" },
            ]}
          />
          <h1>{meeting ? meeting.title || `Pertemuan ${meeting.number}` : "Memuat pertemuan..."}</h1>
          {meeting && (
            <p>
              {meeting.projectName && <span>Project: {meeting.projectName}</span>}
              {meeting.continuesFrom && (
                <Link to={`/mk/${slug}/p/${meeting.continuesFrom.id}`}>
                  Lanjutan dari pertemuan {meeting.continuesFrom.number}
                </Link>
              )}
            </p>
          )}
        </div>

        <div className="topbar-actions">
          {meeting && (
            <StatusStamp status={isLive ? "live" : "finished"} />
          )}
          {isLive && (
            <label className="follow-toggle">
              <input
                type="checkbox"
                checked={followTeacher}
                onChange={(event) => setFollowTeacher(event.target.checked)}
              />
              Follow Dosen
            </label>
          )}
        </div>
      </header>

      {notice && (
        <div className="alert">
          <span>{notice}</span>
          <button className="btn btn-on-dark btn-small" onClick={() => setNotice(null)}>
            Tutup
          </button>
        </div>
      )}

      <ProtectedArea watermark={watermark}>
        <main className="main-layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <strong>Explorer</strong>
              {changeCount > 0 && meeting?.continuesFrom && (
                <small title={`Dibanding Pertemuan ${meeting.continuesFrom.number}`}>
                  {changeCount} file berubah
                </small>
              )}
            </div>

            <FileTree
              nodes={tree}
              selectedFile={selectedFile}
              activeFile={isLive ? activeFile : null}
              flashFiles={flashFiles}
              changes={changes}
              onSelectFile={openFile}
            />
          </aside>

          <section className="editor-panel">
            <CodeViewer
              path={selectedFile}
              file={selectedFile ? files[selectedFile] : null}
              highlights={highlights}
              followHighlights={followTeacher}
            />
          </section>
        </main>
      </ProtectedArea>

      <StatusBar
        connectionStatus={connectionStatus}
        studentName={access.studentName}
        activeFile={activeFile}
        isLive={isLive}
      />
    </div>
  );
}
