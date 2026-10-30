import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CourseDetail from "./CourseDetail.jsx";
import AppHeader from "../layout/AppHeader.jsx";
import AppLayout from "../layout/AppLayout.jsx";
import Sidebar from "../layout/Sidebar.jsx";
import { Button, Card, EmptyState, IconButton, TextField } from "../ui/index.js";
import Copyright from "../../utils/copyright.jsx";
import { MEETING_REFRESH_MS } from "./adminConstants.js";
import { isRunning } from "../../utils/meetingStatus.js";

export default function AdminDashboard({ api, onLogout }) {
  const [courses, setCourses] = useState(null);
  const [liveCourseIds, setLiveCourseIds] = useState(() => new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get("mk")) || null;
  const setSelectedId = useCallback((id) => setSearchParams({ mk: String(id) }, { replace: true }), [setSearchParams]);
  const [newCourseName, setNewCourseName] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);
  const [error, setError] = useState(null);

  const handleError = useCallback(
    (err) => {
      if (err.status === 401) onLogout();
      else setError(err.message);
    },
    [onLogout],
  );

  const loadCourses = useCallback(async () => {
    try {
      const { courses: list } = await api.courses();
      setCourses(list);
      // Daftar mata kuliah tidak memuat status live, jadi badge Live di sidebar perlu pertemuannya.
      const flags = await Promise.all(
        list.map(async (course) => {
          try {
            const { meetings } = await api.meetings(course.id);
            return meetings.some(isRunning) ? course.id : null;
          } catch {
            return null;
          }
        }),
      );
      setLiveCourseIds(new Set(flags.filter((id) => id !== null)));
    } catch (err) {
      handleError(err);
    }
  }, [api, handleError]);

  useEffect(() => {
    loadCourses();
    const timer = setInterval(loadCourses, MEETING_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadCourses]);

  async function createCourse(event) {
    event.preventDefault();
    if (!newCourseName.trim()) return;
    try {
      const { course } = await api.createCourse(newCourseName.trim());
      setNewCourseName("");
      setAddingCourse(false);
      await loadCourses();
      setSelectedId(course.id);
    } catch (err) {
      handleError(err);
    }
  }

  const list = courses || [];
  const selected = list.find((course) => course.id === selectedId) || list[0] || null;

  const sidebar = (
    <Sidebar
      logoSrc="/live-coding-mark.svg"
      workspace="Ruang dosen"
      menu={[{ icon: "book", label: "Mata kuliah", count: list.length, current: true }]}
      courses={list.map((course) => ({ ...course, live: liveCourseIds.has(course.id) }))}
      currentCourseId={selected?.id}
      onSelectCourse={setSelectedId}
      onAddCourse={() => setAddingCourse((value) => !value)}>
      {addingCourse && (
        <form className="lc-sidebar__add" onSubmit={createCourse}>
          <TextField
            label="Mata kuliah baru"
            value={newCourseName}
            onChange={(event) => setNewCourseName(event.target.value)}
            placeholder="Nama mata kuliah"
            maxLength={100}
            autoFocus
          />
          <Button size="sm" type="submit" disabled={!newCourseName.trim()}>
            Tambah mata kuliah
          </Button>
        </form>
      )}
    </Sidebar>
  );

  return (
    <AppLayout sidebar={sidebar}>
      {error && (
        <Card className="lc-notice" role="alert">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={() => setError(null)}>
            Tutup
          </Button>
        </Card>
      )}

      {selected ? (
        <CourseDetail
          key={selected.id}
          api={api}
          course={selected}
          onError={handleError}
          onCourseChanged={loadCourses}
          onLogout={onLogout}
        />
      ) : (
        <>
          <AppHeader
            crumb="Mata kuliah"
            title="Admin dosen"
            actions={<IconButton icon="logout" label="Keluar dari admin" onClick={onLogout} />}
          />
          <Card>
            <EmptyState
              icon="book"
              title={courses === null ? "Memuat mata kuliah..." : "Mulai dari mata kuliah."}
              text={
                courses === null
                  ? undefined
                  : "Setiap mata kuliah mendapat kode akses sendiri. Pertemuan bisa dibuat di sini atau langsung dari VS Code saat memulai sesi."
              }
              action={
                courses?.length === 0 ? (
                  <Button icon="plus" onClick={() => setAddingCourse(true)}>
                    Mata kuliah baru
                  </Button>
                ) : null
              }
            />
          </Card>
        </>
      )}
      <Copyright />
    </AppLayout>
  );
}
