import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AccessGate from "../components/AccessGate.jsx";
import { STATUS_LABEL, formatDateTime, studentApi } from "../lib/api.js";
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
        setGateMessage("Kode akses sudah berubah atau dinonaktifkan. Minta kode terbaru ke dosen.");
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

  const meetings = data?.meetings || [];

  return (
    <div className="page">
      <header className="page-header">
        <Link className="back-link" to="/">
          ← Beranda
        </Link>
        <h1>{data?.course.name || access.courseName}</h1>
        <p className="muted">Masuk sebagai {access.studentName}</p>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      {data && meetings.length === 0 && (
        <section className="card empty-state">Belum ada pertemuan yang tersedia.</section>
      )}

      <ul className="meeting-list">
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <Link className="meeting-card" to={`/mk/${slug}/p/${meeting.id}`}>
              <div className="meeting-main">
                <span className="meeting-number">Pertemuan {meeting.number}</span>
                {meeting.title && <span className="meeting-title">{meeting.title}</span>}
                {meeting.continuesFrom && (
                  <span className="meeting-meta">↳ Lanjutan dari Pertemuan {meeting.continuesFrom.number}</span>
                )}
              </div>
              <div className="meeting-side">
                <span className={`pill pill-${meeting.status}`}>{STATUS_LABEL[meeting.status]}</span>
                <span className="meeting-meta">{formatDateTime(meeting.startedAt)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
