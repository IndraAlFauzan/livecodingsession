import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AccessGate from "../components/AccessGate.jsx";
import Brand from "../components/layout/Brand.jsx";
import MeetingCard from "../components/admin/MeetingCard.jsx";
import { Button, Card, EmptyState, Tabs } from "../components/ui/index.js";
import { formatDateTime, studentApi } from "../lib/api.js";
import { getCourseAccess, storage } from "../lib/storage.js";
import Copyright from "../utils/copyright.jsx";

const REFRESH_MS = 15000;

const FILTERS = [
  { label: "Semua", match: () => true },
  { label: "Live", match: (status) => status === "live" },
  { label: "Selesai", match: (status) => status === "finished" },
];

export default function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [access, setAccess] = useState(() => getCourseAccess(slug));
  const [gateMessage, setGateMessage] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(0);

  const load = useCallback(async () => {
    if (!access) return;
    try {
      setData(await studentApi.course(slug, access.code));
      setError(null);
    } catch (err) {
      if (err.status === 403) {
        storage.forgetCourse(slug);
        setGateMessage("Kode akses sudah diganti atau dinonaktifkan dosen. Minta kode terbaru.");
        setAccess(null);
        return;
      }
      setError(err.message);
    }
  }, [slug, access]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (!access) {
    return <AccessGate slug={slug} message={gateMessage} onSuccess={() => setAccess(getCourseAccess(slug))} />;
  }

  const courseName = data?.course.name || access.courseName;
  // Terbaru di atas: di akhir semester mahasiswa paling sering mencari pertemuan terakhir.
  const meetings = [...(data?.meetings || [])].sort((a, b) => b.number - a.number);
  const live = meetings.find((meeting) => meeting.status === "live") || null;
  const counts = FILTERS.map((item) => meetings.filter((meeting) => item.match(meeting.status)).length);
  const shown = meetings.filter((meeting) => FILTERS[filter].match(meeting.status));

  const open = (meeting) => navigate(`/mk/${slug}/p/${meeting.id}`);

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
    <div className="lc-page lc-page--wide">
      <div className="lc-page__body">
        <Brand size="sm" />
        <div className="lc-pagehead">
          <div className="lc-pagehead__text">
            <h1 className="lc-h1">{courseName}</h1>
            <p className="lc-sub">Masuk sebagai {access.studentName}</p>
          </div>
          <Button variant="secondary" icon="chevron-left" onClick={() => navigate("/")}>
            Beranda
          </Button>
        </div>

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
      <Copyright />
    </div>
  );
}
