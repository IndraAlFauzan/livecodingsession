import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CourseCard from "../components/student/CourseCard.jsx";
import JoinCard from "../components/student/JoinCard.jsx";
import { studentApi } from "../lib/api.js";
import { storage } from "../lib/storage.js";
import Copyright from "../utils/copyright.jsx";

const REFRESH_MS = 30000;

function meetingName(meeting) {
  return meeting.title ? `Pertemuan ${meeting.number}, ${meeting.title}` : `Pertemuan ${meeting.number}`;
}

function SavedCourse({ slug, course, onForget }) {
  const navigate = useNavigate();
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
    <CourseCard
      name={course.name}
      detail={detail}
      live={Boolean(live)}
      meetingCount={state.kind === "ready" ? meetings.length : null}
      onOpen={() => navigate(`/mk/${slug}`)}
      onJoinLive={() => navigate(`/mk/${slug}/p/${live.id}`)}
      onForget={() => onForget(slug)}
    />
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
      <div className="lc-page lc-page--center">
        <JoinCard heading="h1" onSuccess={openCourse} />
        <p className="lc-sub lc-joinbox">
          Kode di halaman kelas hanya bisa dibaca, dan nama kamu tampil samar di atasnya selama kamu melihat.
        </p>
        <Copyright />
      </div>
    );
  }

  return (
    <div className="lc-page lc-page--wide">
      <div className="lc-page__body lc-home">
        <JoinCard onSuccess={openCourse} />

        <div className="lc-stack">
          <div className="lc-pagehead">
            <div className="lc-pagehead__text">
              <h1 className="lc-h1">Mata kuliahmu</h1>
              <p className="lc-sub">
                {studentName ? `Masuk sebagai ${studentName}.` : "Yang pernah kamu buka di perangkat ini."}
              </p>
            </div>
          </div>

          <div className="lc-cards">
            {entries.map(([slug, course]) => (
              <SavedCourse key={slug} slug={slug} course={course} onForget={forget} />
            ))}
          </div>
        </div>
      </div>
      <Copyright />
    </div>
  );
}
