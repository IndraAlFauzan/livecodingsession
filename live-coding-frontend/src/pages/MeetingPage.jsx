import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import JoinGate from "../components/JoinGate.jsx";
import SessionHeader from "../components/session/SessionHeader.jsx";
import ProtectedArea from "../components/ProtectedArea.jsx";
import CodePanel from "../components/session/CodePanel.jsx";
import FileTree from "../components/session/FileTree.jsx";
import SessionBar from "../components/session/SessionBar.jsx";
import { Button, Card, EmptyState, Icon } from "../components/ui/index.js";
import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import { storage } from "../lib/storage.js";
import useLiveSession from "../hooks/useLiveSession.js";

export default function MeetingPage({ focus = false }) {
  const { slug, meetingId } = useParams();
  const navigate = useNavigate();
  const { student, token, logout } = useStudentAuth();
  const [gateMessage, setGateMessage] = useState(null);

  // Pilihan terakhir diingat, jadi yang terbiasa layar penuh tidak perlu
  // menekan tombolnya tiap pertemuan.
  function gantiMode(keFokus) {
    storage.setFocusMode(keFokus);
    const tujuan = keFokus ? `/fokus/mk/${slug}/p/${meetingId}` : `/mk/${slug}/p/${meetingId}`;
    navigate(tujuan, { replace: true });
  }

  // Esc keluar dari layar penuh; tanpa ini mode fokus terasa seperti jalan buntu.
  useEffect(() => {
    if (!focus) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") gantiMode(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  if (gateMessage) {
    return <JoinGate slug={slug} message={gateMessage} onSuccess={() => setGateMessage(null)} />;
  }

  return (
    <MeetingViewer
      key={meetingId}
      slug={slug}
      meetingId={meetingId}
      token={token}
      studentName={student?.name || ""}
      focus={focus}
      onToggleFocus={() => gantiMode(!focus)}
      onAccessRevoked={setGateMessage}
      onSessionExpired={logout}
    />
  );
}

// Dosen menengok halaman mahasiswa dengan tanda dosennya sendiri. Tidak lewat
// StudentGate, dan tidak ikut terhitung sebagai penonton.
export function MeetingPreviewPage() {
  const { slug, meetingId } = useParams();
  const teacherToken = storage.getAdminToken();

  if (!teacherToken) {
    return (
      <div className="lc-page">
        <div className="lc-page__body">
          <p className="lc-muted">
            Pratinjau ini hanya untuk dosen. Masuk dulu di <Link to="/admin">halaman admin</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <MeetingViewer
      key={meetingId}
      slug={slug}
      meetingId={meetingId}
      teacherToken={teacherToken}
      studentName="Pratinjau dosen"
      onAccessRevoked={() => {}}
      onSessionExpired={() => {}}
    />
  );
}

function MeetingViewer({
  slug,
  meetingId,
  token,
  teacherToken,
  studentName,
  focus = false,
  onToggleFocus,
  onAccessRevoked,
  onSessionExpired,
}) {
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
  } = useLiveSession({ meetingId, token, teacherToken, onAccessRevoked, onSessionExpired });

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
  const courseName = course?.name || "Mata kuliah";
  const changeCount = Object.keys(changes).length;
  const highlights = isLive && teacherSelection?.path === selectedFile ? teacherSelection.selections : null;

  // Di dalam kerangka, .lc-main sudah jadi halamannya; pembungkus .lc-page
  // kedua hanya akan menambah tinggi dan memunculkan gulir ganda.
  const inti = (
    <div className={["lc-ide", !focus && "lc-ide--embedded"].filter(Boolean).join(" ")}>
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
          student={studentName}
          actions={
            onToggleFocus && (
              <Button
                variant="ghost"
                size="sm"
                icon={focus ? "chevrons-ud" : "eye"}
                onClick={onToggleFocus}
                title={focus ? "Keluar dari layar penuh (Esc)" : "Buka layar penuh"}>
                {focus ? "Keluar" : "Fokus"}
              </Button>
            )
          }
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
          student={studentName}
          isLive={isLive}
          language={selectedFile ? files[selectedFile]?.language : null}
        />
    </div>
  );

  // Layar penuh memakai pembungkus halamannya sendiri; di kerangka tidak perlu.
  return focus ? <div className="lc-page lc-session-page">{inti}</div> : inti;
}
