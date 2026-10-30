import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Brand from "../components/layout/Brand.jsx";
import InstitutionMarks from "../components/layout/InstitutionMarks.jsx";
import CourseCard from "../components/student/CourseCard.jsx";
import JoinCard from "../components/student/JoinCard.jsx";
import { Button, Card, Dialog, EmptyState } from "../components/ui/index.js";
import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import { studentApi } from "../lib/api.js";
import Copyright from "../utils/copyright.jsx";

const REFRESH_MS = 30000;

function meetingName(meeting) {
  return meeting.title ? `Pertemuan ${meeting.number}, ${meeting.title}` : `Pertemuan ${meeting.number}`;
}

function EnrolledCourse({ course, onLeave }) {
  const navigate = useNavigate();
  const { token } = useStudentAuth();
  const [state, setState] = useState({ kind: "loading" });
  const { slug } = course;

  const load = useCallback(async () => {
    try {
      const { meetings } = await studentApi.course(token, slug);
      setState({ kind: "ready", meetings });
    } catch (err) {
      setState({ kind: err.status === 403 ? "revoked" : "error", message: err.message });
    }
  }, [token, slug]);

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
  else if (state.kind === "revoked") detail = "Kamu sudah dikeluarkan dari mata kuliah ini.";
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
      onLeave={() => onLeave(course)}
    />
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { student, courses, logout, leaveCourse } = useStudentAuth();
  const [akanKeluar, setAkanKeluar] = useState(null);

  const openCourse = (course) => navigate(`/mk/${course.slug}`);

  async function konfirmasiKeluar() {
    const slug = akanKeluar.slug;
    setAkanKeluar(null);
    await leaveCourse(slug);
  }

  return (
    <div className="lc-page lc-page--wide">
      <Brand />
      <div className="lc-page__body lc-home">
        <JoinCard onSuccess={openCourse} />

        <div className="lc-stack">
          <div className="lc-pagehead">
            <div className="lc-pagehead__text">
              <h1 className="lc-h1">Mata kuliahmu</h1>
              <p className="lc-sub">
                {student ? `Masuk sebagai ${student.name} (${student.nim}).` : "Memuat akun..."}
              </p>
            </div>
            <Button variant="secondary" icon="logout" onClick={logout}>
              Keluar
            </Button>
          </div>

          {courses.length === 0 ? (
            <Card>
              <EmptyState
                icon="book"
                title="Belum ikut mata kuliah apa pun."
                text="Masukkan kode akses dari dosen untuk bergabung. Setelah itu mata kuliahnya tersimpan di akunmu."
              />
            </Card>
          ) : (
            <div className="lc-cards">
              {courses.map((course) => (
                <EnrolledCourse key={course.slug} course={course} onLeave={setAkanKeluar} />
              ))}
            </div>
          )}
        </div>
      </div>

      {akanKeluar && (
        <Dialog
          icon="logout"
          title={`Keluar dari ${akanKeluar.name}?`}
          text="Mata kuliah ini hilang dari daftarmu. Untuk masuk lagi kamu butuh kode akses yang berlaku saat itu."
          confirmLabel="Ya, keluar dari kelas"
          onCancel={() => setAkanKeluar(null)}
          onConfirm={konfirmasiKeluar}
        />
      )}

      <footer className="lc-page__foot">
        <InstitutionMarks />
        <Copyright />
      </footer>
    </div>
  );
}
