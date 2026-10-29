import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AccessGate from "../components/AccessGate.jsx";
import Breadcrumb from "../components/Breadcrumb.jsx";
import PageShell from "../components/PageShell.jsx";
import StatusStamp from "../components/StatusStamp.jsx";
import { formatDateTime, studentApi } from "../lib/api.js";
import { getCourseAccess, storage } from "../lib/storage.js";

const REFRESH_MS = 15000;

export default function CoursePage() {
  const { slug } = useParams();
  const [access, setAccess] = useState(() => getCourseAccess(slug));
  const [gateMessage, setGateMessage] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <PageShell label={`Masuk sebagai ${access.studentName}`}>
      <Breadcrumb items={[{ label: "Beranda", to: "/" }, { label: courseName }]} />
      <h1 className="page-title">{courseName}</h1>

      {error && (
        <div className="banner banner-error" role="alert">
          <span>Daftar pertemuan gagal dimuat: {error}</span>
          <button className="btn btn-secondary btn-small" onClick={load}>
            Coba lagi
          </button>
        </div>
      )}

      {!data && !error && <p className="state-text">Memuat daftar pertemuan...</p>}

      {data && meetings.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">Belum ada pertemuan.</p>
          <p>Pertemuan muncul di sini setelah dosen memulai sesi live. Halaman ini memeriksa ulang setiap 15 detik.</p>
        </div>
      )}

      {meetings.length > 0 && (
        <ul className="meeting-list" aria-label={`Pertemuan ${courseName}, terbaru di atas`}>
          {meetings.map((meeting) => {
            const isLive = meeting.status === "live";
            const meta = isLive
              ? "Sedang berlangsung. Buka untuk mengikuti."
              : [
                  meeting.startedAt && formatDateTime(meeting.startedAt),
                  meeting.continuesFrom && `lanjutan pertemuan ${meeting.continuesFrom.number}`,
                ]
                  .filter(Boolean)
                  .join(", ");
            return (
              <li key={meeting.id} className={isLive ? "meeting-row is-live" : "meeting-row"}>
                <Link className="meeting-link" to={`/mk/${slug}/p/${meeting.id}`}>
                  <span className="meeting-label">Pertemuan {meeting.number}</span>
                  <span className="meeting-title">{meeting.title || "Tanpa judul"}</span>
                  {meta && <span className="meeting-meta">{meta}</span>}
                </Link>
                <StatusStamp status={meeting.status} />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
