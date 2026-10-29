import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AccessForm from "../components/AccessForm.jsx";
import PageShell from "../components/PageShell.jsx";
import StatusStamp from "../components/StatusStamp.jsx";
import { studentApi } from "../lib/api.js";
import { storage } from "../lib/storage.js";

const REFRESH_MS = 30000;

function meetingName(meeting) {
  return meeting.title ? `Pertemuan ${meeting.number}, ${meeting.title}` : `Pertemuan ${meeting.number}`;
}

function CourseRow({ slug, course, onForget }) {
  const [state, setState] = useState({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const { meetings } = await studentApi.course(slug, course.code);
      setState({ kind: "ready", meetings });
    } catch (err) {
      setState({ kind: err.status === 403 ? "revoked" : "error", message: err.message });
    }
  }, [slug, course.code]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const meetings = state.meetings || [];
  const live = meetings.find((meeting) => meeting.status === "live");
  const latest = meetings.reduce((a, b) => (!a || b.number > a.number ? b : a), null);

  let detail;
  if (state.kind === "loading") detail = "Memeriksa pertemuan...";
  else if (state.kind === "revoked") detail = "Kode akses sudah diganti dosen. Buka untuk memasukkan kode baru.";
  else if (state.kind === "error") detail = "Status pertemuan tidak bisa dimuat.";
  else if (live) detail = `${meetingName(live)} sedang berlangsung.`;
  else if (latest) detail = `Terakhir: ${meetingName(latest)}.`;
  else detail = "Belum ada pertemuan.";

  return (
    <li className={live ? "class-row is-live" : "class-row"}>
      <div className="class-row-main">
        <Link className="class-row-name" to={`/mk/${slug}`}>
          {course.name}
        </Link>
        <p className="class-row-detail">
          {live && <StatusStamp status="live" />}
          <span>{detail}</span>
        </p>
      </div>
      <div className="class-row-actions">
        {live && (
          <Link className="btn btn-accent btn-small" to={`/mk/${slug}/p/${live.id}`}>
            Ikuti sesi live
          </Link>
        )}
        <button className="btn btn-quiet btn-small" onClick={() => onForget(slug)}>
          Hapus dari daftar
        </button>
      </div>
    </li>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => storage.getCourses());
  const entries = Object.entries(saved);
  const studentName = storage.getStudentName();

  function forget(slug) {
    storage.forgetCourse(slug);
    setSaved(storage.getCourses());
  }

  const openCourse = (course) => navigate(`/mk/${course.slug}`);

  if (entries.length === 0) {
    return (
      <PageShell width="narrow">
        <h1 className="page-title">Masuk ke kelas</h1>
        <p className="lead">Isi nama lengkap dan kode akses mata kuliah yang dibagikan dosen pengampu.</p>
        <section className="panel" aria-label="Form masuk kelas">
          <AccessForm onSuccess={openCourse} />
        </section>
        <p className="page-note">
          Kode di halaman kelas hanya bisa dibaca, dan nama kamu tampil samar di atasnya selama kamu melihat.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow" label={studentName ? `Masuk sebagai ${studentName}` : undefined}>
      <h1 className="page-title">Kelas kamu</h1>
      <ul className="class-list">
        {entries.map(([slug, course]) => (
          <CourseRow key={slug} slug={slug} course={course} onForget={forget} />
        ))}
      </ul>

      <section className="add-course" aria-labelledby="add-course-title">
        <h2 className="section-title" id="add-course-title">
          Tambah mata kuliah lain
        </h2>
        <section className="panel">
          <AccessForm onSuccess={openCourse} />
        </section>
      </section>
    </PageShell>
  );
}
