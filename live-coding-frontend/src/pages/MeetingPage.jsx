import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import AccessGate from "../components/AccessGate.jsx";
import SessionHeader from "../components/session/SessionHeader.jsx";
import ProtectedArea from "../components/ProtectedArea.jsx";
import CodePanel from "../components/session/CodePanel.jsx";
import FileTree from "../components/session/FileTree.jsx";
import SessionBar from "../components/session/SessionBar.jsx";
import { Card, EmptyState, Icon } from "../components/ui/index.js";
import { getCourseAccess, storage } from "../lib/storage.js";
import useLiveSession from "../hooks/useLiveSession.js";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const {
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
  } = useLiveSession({ meetingId, access, onAccessRevoked });

  function selectFile(path) {
    openFile(path);
    setSheetOpen(false);
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
  const changeCount = Object.keys(changes).length;
  const highlights = isLive && teacherSelection?.path === selectedFile ? teacherSelection.selections : null;

  return (
    <div className="lc-page lc-session-page">
      {/* Satu jendela ala VS Code: title bar, Explorer, editor dan status bar menempel tanpa celah. */}
      <div className="lc-ide">
        <SessionHeader
          crumb={`${courseName} / ${meeting ? `Pertemuan ${meeting.number}` : "Pertemuan"}`}
          title={meeting ? meeting.title || `Pertemuan ${meeting.number}` : "Memuat pertemuan..."}
          hasMeeting={Boolean(meeting)}
          isLive={isLive}
          startedAt={meeting?.startedAt}
          meta={
            meeting?.continuesFrom && (
              <Link className="lc-titlebar__link" to={`/mk/${slug}/p/${meeting.continuesFrom.id}`}>
                Lanjutan dari pertemuan {meeting.continuesFrom.number}
              </Link>
            )
          }
          student={access.studentName}
        />

        {teacherWaiting && (
          <div className="lc-ide__notice lc-ide__notice--wait" role="status">
            <p>Koneksi dosen terputus. Menunggu dosen tersambung lagi — kode terakhir tetap terlihat.</p>
          </div>
        )}

        {notice && (
          <div className="lc-ide__notice" role="alert">
            <p>{notice}</p>
            <button type="button" className="lc-ide__notice-close" onClick={() => setNotice(null)}>
              Tutup
            </button>
          </div>
        )}

        <ProtectedArea>
          <div className={["lc-session", sheetOpen && "is-sheet-open"].filter(Boolean).join(" ")}>
            <button
              type="button"
              className="lc-session__files"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen((value) => !value)}>
              <Icon name="folder" />
              File project
            </button>

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
                onSelectFile={selectFile}
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
          language={selectedFile ? files[selectedFile]?.language : null}
        />
      </div>
    </div>
  );
}
