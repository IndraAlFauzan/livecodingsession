import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AccessGate from "../components/AccessGate.jsx";
import AppHeader from "../components/layout/AppHeader.jsx";
import ProtectedArea from "../components/ProtectedArea.jsx";
import CodePanel from "../components/session/CodePanel.jsx";
import FileTree from "../components/session/FileTree.jsx";
import SessionBar from "../components/session/SessionBar.jsx";
import { Badge, Button, Card, EmptyState } from "../components/ui/index.js";
import { WS_URL } from "../config.js";
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
  const [sheetOpen, setSheetOpen] = useState(false);

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
    setSheetOpen(false);
    const ws = socketRef.current;
    if (!filesRef.current[path] && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "file:request", meetingId, path }));
    }
  }

  if (closedMessage) {
    return (
      <div className="lc-page lc-page--center">
        <Card className="lc-joinbox">
          <EmptyState
            icon="shield"
            title={closedMessage}
            action={
              <Link className="lc-btn lc-btn--primary" to={`/mk/${slug}`}>
                Kembali ke daftar pertemuan
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const isLive = meeting?.status === "live" && hasTeacher;
  const courseName = course?.name || access.courseName;
  const watermark = `${access.studentName} · ${courseName} · ${new Date().toLocaleDateString("id-ID")}`;
  const changeCount = Object.keys(changes).length;
  const highlights = isLive && teacherSelection?.path === selectedFile ? teacherSelection.selections : null;

  return (
    <div className="lc-page lc-session-page">
      <AppHeader
        crumb={`${courseName} / ${meeting ? `Pertemuan ${meeting.number}` : "Pertemuan"}`}
        title={meeting ? meeting.title || `Pertemuan ${meeting.number}` : "Memuat pertemuan..."}
        badge={meeting ? <Badge status={isLive ? "live" : "finished"} /> : null}
        meta={
          meeting?.continuesFrom && (
            <Link className="lc-link" to={`/mk/${slug}/p/${meeting.continuesFrom.id}`}>
              Lanjutan dari pertemuan {meeting.continuesFrom.number}
            </Link>
          )
        }
        user={access.studentName}
      />

      {notice && (
        <Card className="lc-notice" role="alert">
          <p>{notice}</p>
          <Button variant="secondary" size="sm" onClick={() => setNotice(null)}>
            Tutup
          </Button>
        </Card>
      )}

      <ProtectedArea watermark={watermark}>
        <div className={["lc-session", sheetOpen && "is-sheet-open"].filter(Boolean).join(" ")}>
          <Button
            className="lc-session__files"
            variant="secondary"
            icon="folder"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen((value) => !value)}>
            File project
          </Button>

          <div className="lc-session__scrim" onClick={() => setSheetOpen(false)} aria-hidden="true" />

          <div className="lc-session__tree">
            <FileTree
              nodes={tree}
              changeCount={meeting?.continuesFrom ? changeCount : 0}
              changeHint={meeting?.continuesFrom ? `Dibanding Pertemuan ${meeting.continuesFrom.number}` : undefined}
              selectedFile={selectedFile}
              activeFile={isLive ? activeFile : null}
              flashFiles={flashFiles}
              changes={changes}
              onSelectFile={openFile}
            />
          </div>

          <CodePanel
            path={selectedFile}
            file={selectedFile ? files[selectedFile] : null}
            highlights={highlights}
            followHighlights={followTeacher}
          />
        </div>
      </ProtectedArea>

      <SessionBar
        connectionStatus={connectionStatus}
        teacherFile={activeFile}
        follow={followTeacher}
        onFollowChange={setFollowTeacher}
        student={access.studentName}
        isLive={isLive}
      />
    </div>
  );
}
