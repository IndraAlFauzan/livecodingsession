import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "./AppLayout.jsx";
import Sidebar from "./Sidebar.jsx";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";

// Kerangka untuk semua halaman mahasiswa. Memakai AppLayout dan Sidebar yang
// sama dengan halaman dosen -- keduanya sudah ada di design system, termasuk
// perilaku jadi drawer di bawah 1024px.
export default function StudentShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { slug } = useParams();
  const { courses } = useStudentAuth();

  const sidebar = (
    <Sidebar
      logoSrc="/live-coding-mark.svg"
      workspace="Ruang mahasiswa"
      menu={[
        { icon: "grid", label: "Beranda", current: pathname === "/", onClick: () => navigate("/") },
        {
          icon: "book",
          label: "Mata kuliah",
          count: courses.length,
          current: pathname.startsWith("/mk"),
          onClick: () => navigate("/mk"),
        },
        { icon: "settings", label: "Akun", current: pathname === "/akun", onClick: () => navigate("/akun") },
      ]}
      coursesLabel="Diikuti"
      addLabel="Gabung mata kuliah"
      // Sidebar memakai `id`; slug sudah unik per mata kuliah, jadi dipakai
      // langsung. Badge Live dan jumlah pertemuan sudah ikut di muatan /home,
      // jadi menampilkannya tidak menambah permintaan apa pun.
      courses={courses.map((course) => ({
        id: course.slug,
        name: course.name,
        live: Boolean(course.live),
        meetingCount: course.meetingCount,
      }))}
      currentCourseId={slug}
      onSelectCourse={(id) => navigate(`/mk/${id}`)}
      onAddCourse={() => navigate("/mk")}
    />
  );

  return (
    <AppLayout sidebar={sidebar}>
      <Outlet />
    </AppLayout>
  );
}
