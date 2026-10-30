import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AccessCodeCard from "../components/admin/AccessCodeCard.jsx";
import LiveSessionCard from "../components/admin/LiveSessionCard.jsx";
import MeetingCard from "../components/admin/MeetingCard.jsx";
import MeetingDetail from "../components/admin/MeetingDetail.jsx";
import MeetingTable from "../components/admin/MeetingTable.jsx";
import ViewerList from "../components/admin/ViewerList.jsx";
import AppHeader from "../components/layout/AppHeader.jsx";
import AuthAside from "../components/layout/AuthAside.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import { Button, Card, Dialog, EmptyState, IconButton, Tabs, TextField } from "../components/ui/index.js";
import { adminApi, formatDateTime } from "../lib/api.js";
import { storage } from "../lib/storage.js";
import Copyright from "../utils/copyright.jsx";

const MEETING_REFRESH_MS = 10000;

const FILTERS = [
  { label: "Semua", match: () => true },
  { label: "Live", match: (status) => status === "live" },
  { label: "Selesai", match: (status) => status === "finished" },
  { label: "Belum dimulai", match: (status) => status === "draft" },
];

// Pertemuan yang ditandai live tapi dosennya tidak terhubung sudah selesai.
// Selama masa tenggang dosen masih ditunggu, jadi tetap dihitung live.
function derivedStatus(meeting) {
  const connected = meeting.teacherConnected || meeting.reconnecting;
  return meeting.status === "live" && !connected ? "finished" : meeting.status;
}

export default function AdminPage() {
  const [token, setToken] = useState(() => storage.getAdminToken());
  const api = useMemo(() => (token ? adminApi(token) : null), [token]);

  const logout = useCallback(() => {
    storage.setAdminToken(null);
    setToken(null);
  }, []);

  if (!api) {
    return (
      <AdminLogin
        onLogin={(value) => {
          storage.setAdminToken(value);
          setToken(value);
        }}
      />
    );
  }
  return <AdminDashboard api={api} onLogout={logout} />;
}

function AdminLogin({ onLogin }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminApi(value.trim()).check();
      onLogin(value.trim());
    } catch (err) {
      setError(err.status === 401 ? "Token tidak cocok dengan TEACHER_TOKEN di server." : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      aside={
        <AuthAside
          title="Mulai sesi dari VS Code, kelas ikut melihat."
          text="Kelola mata kuliah, kode akses, dan pertemuan di sini. Sesi live dijalankan dari extension."
        />
      }>
      <form className="lc-join lc-joinbox" onSubmit={handleSubmit}>
        <div>
          <h1 className="lc-join__title">Masuk sebagai dosen</h1>
          <p className="lc-join__text">Gunakan teacher token yang sama dengan setting VS Code kamu.</p>
        </div>
        <TextField
          label="Teacher token"
          type="password"
          mono
          icon="key"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="current-password"
          autoFocus
          error={error}
        />
        <Button size="lg" block type="submit" disabled={submitting || !value.trim()}>
          {submitting ? "Memeriksa token..." : "Masuk ke admin"}
        </Button>
      </form>
    </AuthLayout>
  );
}

function AdminDashboard({ api, onLogout }) {
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
            return meetings.some(
              (meeting) => meeting.status === "live" && (meeting.teacherConnected || meeting.reconnecting),
            )
              ? course.id
              : null;
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

function CourseDetail({ api, course, onError, onCourseChanged, onLogout }) {
  const [meetings, setMeetings] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [addingMeeting, setAddingMeeting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState(0);
  const [detailOf, setDetailOf] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [liveViewers, setLiveViewers] = useState([]);

  const loadMeetings = useCallback(async () => {
    try {
      const list = (await api.meetings(course.id)).meetings;
      setMeetings(list);

      // Web dosen tidak punya koneksi WebSocket, jadi daftar penonton ikut polling.
      const running = list.find((meeting) => meeting.status === "live" && meeting.teacherConnected);
      if (!running) {
        setLiveViewers([]);
        return;
      }
      const { watchingNow } = await api.meetingViewers(running.id);
      setLiveViewers(watchingNow || []);
    } catch (err) {
      onError(err);
    }
  }, [api, course.id, onError]);

  const openDetail = useCallback(
    async (meeting) => {
      setDetailOf(meeting);
      setDetailData(null);
      try {
        setDetailData(await api.meetingViewers(meeting.id));
      } catch (err) {
        onError(err);
      }
    },
    [api, onError],
  );

  useEffect(() => {
    loadMeetings();
    const timer = setInterval(loadMeetings, MEETING_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadMeetings]);

  async function run(action, { reloadCourses = false } = {}) {
    try {
      await action();
      setConfirm(null);
      await loadMeetings();
      if (reloadCourses) await onCourseChanged();
      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(course.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard tidak diizinkan browser; kode tetap terlihat untuk disalin manual.
    }
  }

  function openMeeting(meeting) {
    storage.saveCourse(course.slug, course.name, course.accessCode);
    if (!storage.getStudentName()) storage.setStudentName("Dosen");
    window.open(`/mk/${course.slug}/p/${meeting.id}`, "_blank", "noopener");
  }

  function createMeeting(event) {
    event.preventDefault();
    const title = newMeetingTitle.trim();
    run(
      async () => {
        await api.createMeeting(course.id, title ? { title } : {});
        setNewMeetingTitle("");
        setAddingMeeting(false);
      },
      { reloadCourses: true },
    );
  }

  async function saveName(event) {
    event.preventDefault();
    if (await run(() => api.updateCourse(course.id, { name: editingName }), { reloadCourses: true })) {
      setEditingName(null);
    }
  }

  const all = [...(meetings || [])].sort((a, b) => b.number - a.number);
  const liveMeeting = all.find((meeting) => derivedStatus(meeting) === "live") || null;
  const featured = liveMeeting || all[0] || null;
  const counts = FILTERS.map((item) => all.filter((meeting) => item.match(derivedStatus(meeting))).length);
  const shown = all.filter((meeting) => FILTERS[filter].match(derivedStatus(meeting)));
  const deletingMeeting = typeof confirm === "string" && confirm.startsWith("delete:")
    ? all.find((meeting) => String(meeting.id) === confirm.slice(7))
    : null;

  return (
    <>
      <AppHeader
        crumb="Mata kuliah"
        title={course.name}
        live={Boolean(liveMeeting)}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditingName(course.name)}>
              Ubah nama
            </Button>
            <IconButton icon="logout" label="Keluar dari admin" onClick={onLogout} />
          </>
        }
      />

      {editingName !== null && (
        <Card title="Ubah nama mata kuliah" icon="book">
          <form className="lc-inline-form" onSubmit={saveName}>
            <TextField
              label="Nama mata kuliah"
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              maxLength={100}
              autoFocus
            />
            <Button type="submit" disabled={!editingName.trim()}>
              Simpan
            </Button>
            <Button variant="ghost" onClick={() => setEditingName(null)}>
              Batal
            </Button>
          </form>
        </Card>
      )}

      <div className="lc-grid" style={{ gridTemplateColumns: "1.35fr 1fr 1fr" }}>
        {featured ? (
          <MeetingCard
            number={featured.number}
            status={derivedStatus(featured)}
            continuesFrom={featured.continuesFrom?.number}
            title={featured.title}
            date={featured.startedAt ? formatDateTime(featured.startedAt) : undefined}
            startedAt={featured.startedAt}
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={featured.status === "draft" || !featured.visible}
                title={
                  featured.status === "draft"
                    ? "Belum pernah dimulai"
                    : !featured.visible
                      ? "Tampilkan dulu untuk membuka"
                      : undefined
                }
                onClick={() => openMeeting(featured)}>
                Buka pertemuan
              </Button>
            }
          />
        ) : (
          <Card>
            <EmptyState
              icon="calendar"
              title={meetings === null ? "Memuat pertemuan..." : "Belum ada pertemuan."}
              text={meetings === null ? undefined : "Tambahkan di kartu Pertemuan, atau mulai sesi dari VS Code."}
            />
          </Card>
        )}

        <LiveSessionCard
          live={Boolean(liveMeeting)}
          number={liveMeeting?.number}
          title={liveMeeting?.title}
          startedAt={liveMeeting?.startedAt}
        />

        <AccessCodeCard
          code={course.accessCode}
          active={course.codeActive}
          copied={copied}
          onCopy={copyCode}
          onToggle={() => run(() => api.updateCourse(course.id, { codeActive: !course.codeActive }), { reloadCourses: true })}
          onRegenerate={() => setConfirm("regenerate")}
        />
      </div>

      <Card
        title="Pertemuan"
        icon="calendar"
        actions={
          <>
            <Tabs
              items={FILTERS.map((item, index) => ({ label: item.label, count: counts[index] }))}
              value={filter}
              onChange={setFilter}
            />
            <Button variant="secondary" size="sm" icon="plus" onClick={() => setAddingMeeting((value) => !value)}>
              Tambah pertemuan
            </Button>
          </>
        }>
        {addingMeeting && (
          <form className="lc-inline-form" onSubmit={createMeeting}>
            <TextField
              label="Judul pertemuan baru"
              value={newMeetingTitle}
              onChange={(event) => setNewMeetingTitle(event.target.value)}
              placeholder="Judul pertemuan berikutnya (opsional)"
              maxLength={200}
              autoFocus
            />
            <Button type="submit">Tambah pertemuan</Button>
            <Button variant="ghost" onClick={() => setAddingMeeting(false)}>
              Batal
            </Button>
          </form>
        )}

        {meetings === null && <p className="lc-muted">Memuat pertemuan...</p>}

        {meetings?.length === 0 && (
          <EmptyState
            icon="calendar"
            title="Belum ada pertemuan."
            text='Tambahkan di atas, atau mulai sesi dari VS Code dan pilih "Pertemuan baru".'
          />
        )}

        {meetings?.length > 0 && shown.length === 0 && (
          <EmptyState icon="calendar" title={`Tidak ada pertemuan ${FILTERS[filter].label.toLowerCase()}.`} />
        )}

        {shown.length > 0 && (
          <MeetingTable
            meetings={shown}
            onRename={(meeting, title) => run(() => api.updateMeeting(meeting.id, { title }))}
            onToggleVisible={(meeting) => run(() => api.updateMeeting(meeting.id, { visible: !meeting.visible }))}
            onOpen={openMeeting}
            onAskDelete={(meeting) => setConfirm(`delete:${meeting.id}`)}
            onDetail={openDetail}
          />
        )}
      </Card>

      <ViewerList viewers={liveViewers} live={Boolean(liveMeeting)} />

      <Card title="Hapus mata kuliah" icon="trash">
        <div className="lc-danger-zone">
          <p className="lc-muted">Semua pertemuan dan kode yang tersimpan ikut terhapus.</p>
          <Button variant="danger" onClick={() => setConfirm("delete-course")}>
            Hapus mata kuliah ini
          </Button>
        </div>
      </Card>

      {detailOf && (
        <MeetingDetail
          meeting={detailOf}
          status={derivedStatus(detailOf)}
          data={detailData}
          onClose={() => setDetailOf(null)}
        />
      )}

      {confirm === "regenerate" && (
        <Dialog
          icon="refresh"
          title={`Buat kode akses baru untuk ${course.name}?`}
          text="Kode lama langsung tidak berlaku dan mahasiswa harus memasukkan kode baru."
          confirmLabel="Ya, buat kode baru"
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(() => api.regenerateCode(course.id), { reloadCourses: true })}
        />
      )}

      {deletingMeeting && (
        <Dialog
          title={`Hapus pertemuan ${deletingMeeting.number}?`}
          text={`${deletingMeeting.title || "Tanpa judul"} beserta semua filenya akan hilang permanen.`}
          confirmLabel="Ya, hapus permanen"
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(() => api.deleteMeeting(deletingMeeting.id), { reloadCourses: true })}
        />
      )}

      {confirm === "delete-course" && (
        <Dialog
          title={`Hapus ${course.name}?`}
          text={`${course.name} beserta ${all.length} pertemuan dan semua kodenya akan hilang permanen.`}
          confirmLabel="Ya, hapus permanen"
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(() => api.deleteCourse(course.id), { reloadCourses: true })}
        />
      )}
    </>
  );
}
