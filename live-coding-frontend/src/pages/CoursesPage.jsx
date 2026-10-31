import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader.jsx";
import CourseCard from "../components/student/CourseCard.jsx";
import JoinCard from "../components/student/JoinCard.jsx";
import { Button, Card, Dialog, EmptyState } from "../components/ui/index.js";
import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import { storage } from "../lib/storage.js";
import { meetingPath, meetingName } from "../utils/meetingStatus.js";

export default function CoursesPage() {
  const navigate = useNavigate();
  const { student, courses, leaveCourse } = useStudentAuth();
  const [akanKeluar, setAkanKeluar] = useState(null);
  const [gabung, setGabung] = useState(false);

  // Kolom kode hanya ditampilkan saat memang dibutuhkan: dipakai sekali per
  // mata kuliah, jadi tidak perlu menempati layar setiap hari.
  const belumPunya = courses.length === 0;
  const formTerlihat = gabung || belumPunya;

  async function konfirmasiKeluar() {
    const slug = akanKeluar.slug;
    setAkanKeluar(null);
    await leaveCourse(slug);
  }

  function detailUntuk(course) {
    if (course.live) return `${meetingName(course.live)} sedang berlangsung.`;
    if (course.latest) return `Terakhir: ${meetingName(course.latest)}.`;
    return "Belum ada pertemuan.";
  }

  return (
    <>
      <AppHeader
        title="Mata kuliah"
        crumb="Live Coding"
        user={student?.name}
        actions={
          !belumPunya && (
            <Button variant="secondary" icon="plus" onClick={() => setGabung((n) => !n)}>
              Gabung
            </Button>
          )
        }
      />

      <div className="lc-page__body">
        {formTerlihat && (
          <JoinCard
            onSuccess={(course) => {
              setGabung(false);
              navigate(`/mk/${course.slug}`);
            }}
          />
        )}

        {belumPunya ? (
          <Card>
            <EmptyState
              icon="book"
              title="Belum mengikuti mata kuliah apa pun."
              text="Masukkan kode akses dari dosen. Setelah itu mata kuliahnya tersimpan di akunmu."
            />
          </Card>
        ) : (
          <div className="lc-cards">
            {courses.map((course) => (
              <CourseCard
                key={course.slug}
                name={course.name}
                detail={detailUntuk(course)}
                live={Boolean(course.live)}
                meetingCount={course.meetingCount}
                onOpen={() => navigate(`/mk/${course.slug}`)}
                onJoinLive={() => navigate(meetingPath(course.slug, course.live.id, storage.getFocusMode()))}
                onLeave={() => setAkanKeluar(course)}
              />
            ))}
          </div>
        )}
      </div>

      {akanKeluar && (
        <Dialog
          icon="logout"
          title={`Keluar dari ${akanKeluar.name}?`}
          text="Mata kuliah ini hilang dari daftarmu. Untuk masuk lagi kamu butuh kode akses yang berlaku saat itu."
          confirmLabel="Ya, keluar"
          onCancel={() => setAkanKeluar(null)}
          onConfirm={konfirmasiKeluar}
        />
      )}
    </>
  );
}
