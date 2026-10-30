import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../config.js";
import { sortTree } from "../utils/tree.js";

// Seluruh percakapan WebSocket satu pertemuan. Dipisah dari komponen supaya
// MeetingPage hanya mengurus tampilan, dan alur sesi bisa dibaca utuh di sini.
export default function useLiveSession({ meetingId, access, onAccessRevoked }) {
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
  const [teacherWaiting, setTeacherWaiting] = useState(false);

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
          setTeacherWaiting(false);

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

        // Dosen putus tapi masih ditunggu: pertemuan belum dinyatakan selesai.
        case "teacher:waiting":
          setTeacherWaiting(true);
          setTeacherSelection(null);
          break;

        case "teacher:disconnected":
          setTeacherWaiting(false);
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
          else if (message.reason === "unavailable" || message.reason === "invalid_name")
            setClosedMessage(message.message);
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
        ws.send(
          JSON.stringify({
            type: "student:join",
            meetingId,
            accessCode: access.code,
            studentName: access.studentName,
          }),
        );
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
  }, [meetingId, access.code, access.studentName]);

  useEffect(() => {
    const ws = socketRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "student:view", path: selectedFile, following: followTeacher }));
  }, [selectedFile, followTeacher, connectionStatus]);

  function openFile(path) {
    setSelectedFile(path);
    const ws = socketRef.current;
    if (!filesRef.current[path] && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "file:request", meetingId, path }));
    }
  }

  return {
    connectionStatus,
    course,
    meeting,
    hasTeacher,
    tree,
    files,
    changes,
    selectedFile,
    activeFile,
    teacherSelection,
    followTeacher,
    setFollowTeacher,
    flashFiles,
    notice,
    setNotice,
    closedMessage,
    teacherWaiting,
    openFile,
  };
}
