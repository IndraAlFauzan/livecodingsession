import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import JoinGate from "../components/JoinGate.jsx";
import AppHeader from "../components/layout/AppHeader.jsx";
import MeetingCard from "../components/admin/MeetingCard.jsx";
import { Button, Card, EmptyState, Tabs } from "../components/ui/index.js";
import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import { storage } from "../lib/storage.js";
import { meetingPath } from "../utils/meetingStatus.js";
import { formatDateTime, studentApi } from "../lib/api.js";

const REFRESH_MS = 15000;

const FILTERS = [
  { label: "Semua", match: () => true },
  { label: "Live", match: (status) => status === "live" },
  { label: "Selesai", match: (status) => status === "finished" },
];

export default function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { student, token, refresh } = useStudentAuth();
  const [belumGabung, setBelumGabung] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await studentApi.course(token, slug));
      setBelumGabung(false);
      setError(null);
    } catch (err) {
      // 403 di sini berarti belum (atau tidak lagi) jadi anggota -- bukan galat,
      // tapi pintu yang perlu dibuka dengan kode akses.
      if (err.status === 403) {
        setBelumGabung(true);
        return;
      }
      setError(err.message);
    }
  }, [slug, token]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (belumGabung) {
    return (
      <JoinGate
        slug={slug}
        message="Kamu belum tergabung di mata kuliah ini. Masukkan kode aksesnya dari dosen."
        onSuccess={() => {
          setBelumGabung(false);
          refresh();
        }}
      />
    );
  }

  const courseName = data?.course.name || "Mata kuliah";
  // Terbaru di atas: di akhir semester mahasiswa paling sering mencari pertemuan terakhir.
  const meetings = [...(data?.meetings || [])].sort((a, b) => b.number - a.number);
  const live = meetings.find((meeting) => meeting.status === "live") || null;
  const counts = FILTERS.map((item) => meetings.filter((meeting) => item.match(meeting.status)).length);
  const shown = meetings.filter((meeting) => FILTERS[filter].match(meeting.status));

  const open = (meeting) => navigate(meetingPath(slug, meeting.id, storage.getFocusMode()));

  function cardFor(meeting) {
    return (
      <MeetingCard
        key={meeting.id}
        number={meeting.number}
        status={meeting.status}
        continuesFrom={meeting.continuesFrom?.number}
        title={meeting.title}
        date={meeting.startedAt ? formatDateTime(meeting.startedAt) : undefined}
        startedAt={meeting.startedAt}
        action={
          meeting.status === "live" ? (
            <Button variant="violet" icon="radio" onClick={() => open(meeting)}>
              Ikuti sesi live
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => open(meeting)}>
              Buka
            </Button>
          )
        }
      />
    );
  }

  return (
    <>
      <AppHeader
        crumb="Mata kuliah"
        title={courseName}
        live={Boolean(live)}
        user={student?.name}
        actions={
          <Button variant="secondary" icon="chevron-left" onClick={() => navigate("/mk")}>
            Semua mata kuliah
          </Button>
        }
      />

      <div className="lc-page__body">

        {error && (
          <Card className="lc-notice" role="alert">
            <p>Daftar pertemuan gagal dimuat: {error}</p>
            <Button variant="secondary" size="sm" onClick={load}>
              Coba lagi
            </Button>
          </Card>
        )}

        {!data && !error && <p className="lc-muted">Memuat daftar pertemuan...</p>}

        {live && cardFor(live)}

        {data && meetings.length === 0 && (
          <Card>
            <EmptyState
              icon="calendar"
              title="Belum ada pertemuan."
              text="Pertemuan muncul di sini setelah dosen memulai sesi live. Halaman ini memeriksa ulang setiap 15 detik."
            />
          </Card>
        )}

        {meetings.length > 0 && (
          <>
            <Tabs
              items={FILTERS.map((item, index) => ({ label: item.label, count: counts[index] }))}
              value={filter}
              onChange={setFilter}
            />
            {shown.length > 0 ? (
              <div className="lc-cards">{shown.map(cardFor)}</div>
            ) : (
              <Card>
                <EmptyState icon="calendar" title={`Tidak ada pertemuan ${FILTERS[filter].label.toLowerCase()}.`} />
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
