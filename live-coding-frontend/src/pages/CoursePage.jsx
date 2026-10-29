import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AccessGate from "../components/AccessGate.jsx";
import PageShell from "../components/PageShell.jsx";
import StatusStamp from "../components/StatusStamp.jsx";
import { chapterNumber, formatDateTime, studentApi } from "../lib/api.js";
import { getCourseAccess, storage } from "../lib/storage.js";

const REFRESH_MS = 15000;

export default function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
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

  const meetings = data?.meetings || [];
  const liveMeeting = meetings.find((meeting) => meeting.status === "live");
  const meetingUrl = (meeting) => `/mk/${slug}/p/${meeting.id}`;

  return (
    <PageShell label={`Masuk sebagai ${access.studentName}`}>
      <Link className="back-link" to="/">
        Beranda
      </Link>
      <h1 className="page-title">{data?.course.name || access.courseName}</h1>

      {error && (
        <div className="banner banner-error" role="alert">
          <span>Daftar pertemuan gagal dimuat: {error}</span>
          <button className="btn btn-secondary btn-small" onClick={load}>
            Coba lagi
          </button>
        </div>
      )}

      {liveMeeting && (
        <section className="live-callout" aria-labelledby="live-title">
          <div>
            <StatusStamp status="live" />
            <h2 className="live-title" id="live-title">
              Pertemuan {liveMeeting.number}
              {liveMeeting.title && <span className="live-subtitle">{liveMeeting.title}</span>}
            </h2>
            <p className="live-meta">Dosen sedang menulis kode. Buka untuk mengikuti secara langsung.</p>
          </div>
          <button className="btn btn-accent" onClick={() => navigate(meetingUrl(liveMeeting))}>
            Ikuti sesi live
          </button>
        </section>
      )}

      <section aria-labelledby="toc-title">
        <h2 className="section-title" id="toc-title">
          Daftar pertemuan
        </h2>

        {!data && !error && <p className="state-text">Memuat daftar pertemuan...</p>}

        {data && meetings.length === 0 && (
          <div className="empty-state">
            <p className="empty-title">Belum ada pertemuan yang dibuka.</p>
            <p>Pertemuan muncul di sini setelah dosen memulai sesi live. Halaman ini memeriksa ulang setiap 15 detik.</p>
          </div>
        )}

        {meetings.length > 0 && (
          <ol className="toc">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <Link className="toc-row" to={meetingUrl(meeting)}>
                  <span className="toc-number" aria-hidden="true">
                    {chapterNumber(meeting.number)}
                  </span>
                  <span className="toc-body">
                    <span className="toc-title">
                      {meeting.title || `Pertemuan ${meeting.number}`}
                      <span className="visually-hidden"> (pertemuan {meeting.number})</span>
                    </span>
                    <span className="toc-meta">
                      {meeting.continuesFrom && <span>Lanjutan dari pertemuan {meeting.continuesFrom.number}</span>}
                      {meeting.startedAt && <span>{formatDateTime(meeting.startedAt)}</span>}
                    </span>
                  </span>
                  <StatusStamp status={meeting.status} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </PageShell>
  );
}
