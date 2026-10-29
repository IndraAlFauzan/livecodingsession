import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import StatusStamp from "../components/StatusStamp.jsx";
import { adminApi, formatDateTime } from "../lib/api.js";
import { storage } from "../lib/storage.js";

const MEETING_REFRESH_MS = 10000;

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
    <PageShell width="narrow" label="Admin dosen">
      <h1 className="page-title">Masuk sebagai dosen</h1>
      <p className="lead">Gunakan teacher token yang sama dengan setting VS Code kamu.</p>
      <section className="panel">
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Teacher token</span>
            <input
              type="password"
              className="input-code"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting || !value.trim()}>
            {submitting ? "Memeriksa token..." : "Masuk ke admin"}
          </button>
        </form>
      </section>
    </PageShell>
  );
}

function AdminDashboard({ api, onLogout }) {
  const [courses, setCourses] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get("mk")) || null;
  const setSelectedId = useCallback((id) => setSearchParams({ mk: String(id) }, { replace: true }), [setSearchParams]);
  const [newCourseName, setNewCourseName] = useState("");
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
      setCourses((await api.courses()).courses);
    } catch (err) {
      handleError(err);
    }
  }, [api, handleError]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  async function createCourse(event) {
    event.preventDefault();
    if (!newCourseName.trim()) return;
    try {
      const { course } = await api.createCourse(newCourseName.trim());
      setNewCourseName("");
      await loadCourses();
      setSelectedId(course.id);
    } catch (err) {
      handleError(err);
    }
  }

  const list = courses || [];
  const selected = list.find((course) => course.id === selectedId) || list[0] || null;

  return (
    <PageShell
      width="wide"
      label="Admin dosen"
      actions={
        <button className="btn btn-secondary btn-small" onClick={onLogout}>
          Keluar
        </button>
      }>
      {error && (
        <div className="banner banner-error" role="alert">
          <span>{error}</span>
          <button className="btn btn-secondary btn-small" onClick={() => setError(null)}>
            Tutup
          </button>
        </div>
      )}

      <div className="admin-grid">
        <aside className="course-nav" aria-labelledby="course-nav-title">
          <h2 className="section-title" id="course-nav-title">
            Mata kuliah
          </h2>

          {courses === null && !error && <p className="state-text">Memuat mata kuliah...</p>}
          {courses?.length === 0 && <p className="state-text">Belum ada. Tambahkan mata kuliah pertama di bawah.</p>}

          {list.length > 0 && (
            <ul className="course-list">
              {list.map((course) => (
                <li key={course.id}>
                  <button
                    className="course-item"
                    aria-current={course.id === selected?.id ? "true" : undefined}
                    onClick={() => setSelectedId(course.id)}>
                    <span className="course-item-name">{course.name}</span>
                    <span className="course-item-meta">{course.meetingCount} pertemuan</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="stack-form" onSubmit={createCourse}>
            <label className="field">
              <span className="field-label">Mata kuliah baru</span>
              <input
                value={newCourseName}
                onChange={(event) => setNewCourseName(event.target.value)}
                placeholder="Nama mata kuliah"
                maxLength={100}
              />
            </label>
            <button className="btn btn-secondary" type="submit" disabled={!newCourseName.trim()}>
              Tambah mata kuliah
            </button>
          </form>
        </aside>

        {selected ? (
          <CourseDetail key={selected.id} api={api} course={selected} onError={handleError} onCourseChanged={loadCourses} />
        ) : (
          courses?.length === 0 && (
            <section className="empty-state">
              <p className="empty-title">Mulai dari mata kuliah.</p>
              <p>
                Setiap mata kuliah mendapat kode akses sendiri. Pertemuan bisa dibuat di sini atau langsung dari VS Code
                saat memulai sesi.
              </p>
            </section>
          )
        )}
      </div>
    </PageShell>
  );
}

function CourseDetail({ api, course, onError, onCourseChanged }) {
  const [meetings, setMeetings] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [copied, setCopied] = useState(false);

  const loadMeetings = useCallback(async () => {
    try {
      setMeetings((await api.meetings(course.id)).meetings);
    } catch (err) {
      onError(err);
    }
  }, [api, course.id, onError]);

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

  return (
    <section className="course-detail" aria-labelledby="course-title">
      {editingName === null ? (
        <div className="detail-heading">
          <h1 className="page-title" id="course-title">
            {course.name}
          </h1>
          <button className="btn btn-quiet btn-small" onClick={() => setEditingName(course.name)}>
            Ubah nama
          </button>
        </div>
      ) : (
        <form className="inline-form detail-heading" onSubmit={saveName}>
          <label className="visually-hidden" htmlFor="course-name-input">
            Nama mata kuliah
          </label>
          <input
            id="course-name-input"
            className="input-title"
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
            maxLength={100}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={!editingName.trim()}>
            Simpan
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => setEditingName(null)}>
            Batal
          </button>
        </form>
      )}

      <div className="code-panel">
        <div className="code-panel-main">
          <span className="field-label" id="access-code-label">
            Kode akses mahasiswa
          </span>
          <div className="code-panel-value">
            <code aria-labelledby="access-code-label" className={course.codeActive ? "" : "is-inactive"}>
              {course.accessCode}
            </code>
            <StatusStamp status={course.codeActive ? "active" : "inactive"} />
          </div>
          <p className="field-hint">
            {course.codeActive
              ? "Bagikan hanya ke kelas mata kuliah ini."
              : "Mahasiswa tidak bisa masuk sampai kode diaktifkan lagi."}
          </p>
        </div>

        <div className="button-row">
          <button className="btn btn-primary btn-small" onClick={copyCode}>
            {copied ? "Kode tersalin" : "Salin kode"}
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => run(() => api.updateCourse(course.id, { codeActive: !course.codeActive }), { reloadCourses: true })}>
            {course.codeActive ? "Nonaktifkan" : "Aktifkan"}
          </button>
          {confirm === "regenerate" ? (
            <div className="confirm" role="group" aria-label="Konfirmasi kode baru">
              <span className="confirm-text">Kode lama langsung tidak berlaku.</span>
              <button
                className="btn btn-danger btn-small"
                onClick={() => run(() => api.regenerateCode(course.id), { reloadCourses: true })}>
                Ya, buat kode baru
              </button>
              <button className="btn btn-quiet btn-small" onClick={() => setConfirm(null)}>
                Batal
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-small" onClick={() => setConfirm("regenerate")}>
              Buat kode baru
            </button>
          )}
        </div>
      </div>

      <section aria-labelledby="meetings-title">
        <h2 className="section-title" id="meetings-title">
          Pertemuan
        </h2>

        <form className="inline-form" onSubmit={createMeeting}>
          <label className="visually-hidden" htmlFor="meeting-title-input">
            Judul pertemuan baru
          </label>
          <input
            id="meeting-title-input"
            value={newMeetingTitle}
            onChange={(event) => setNewMeetingTitle(event.target.value)}
            placeholder="Judul pertemuan berikutnya (opsional)"
            maxLength={200}
          />
          <button className="btn btn-secondary" type="submit">
            Tambah pertemuan
          </button>
        </form>

        {meetings === null && <p className="state-text">Memuat pertemuan...</p>}

        {meetings?.length === 0 && (
          <div className="empty-state">
            <p className="empty-title">Belum ada pertemuan.</p>
            <p>Tambahkan di atas, atau mulai sesi dari VS Code dan pilih "Pertemuan baru".</p>
          </div>
        )}

        {meetings?.length > 0 && (
          <ul className="admin-meetings" aria-label="Pertemuan, terbaru di atas">
            {[...meetings]
              .sort((a, b) => b.number - a.number)
              .map((meeting) => (
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  confirming={confirm === `delete:${meeting.id}`}
                  onRename={(title) => run(() => api.updateMeeting(meeting.id, { title }))}
                  onToggleVisible={() => run(() => api.updateMeeting(meeting.id, { visible: !meeting.visible }))}
                  onAskDelete={() => setConfirm(`delete:${meeting.id}`)}
                  onCancelDelete={() => setConfirm(null)}
                  onDelete={() => run(() => api.deleteMeeting(meeting.id), { reloadCourses: true })}
                  onOpen={() => openMeeting(meeting)}
                />
              ))}
          </ul>
        )}
      </section>

      <section className="danger-zone" aria-labelledby="danger-title">
        <h2 className="section-title" id="danger-title">
          Hapus mata kuliah
        </h2>
        {confirm === "delete-course" ? (
          <div className="confirm" role="group" aria-label="Konfirmasi hapus mata kuliah">
            <span className="confirm-text">
              {course.name} beserta {meetings?.length ?? 0} pertemuan dan semua kodenya akan hilang permanen.
            </span>
            <button className="btn btn-danger btn-small" onClick={() => run(() => api.deleteCourse(course.id), { reloadCourses: true })}>
              Ya, hapus permanen
            </button>
            <button className="btn btn-quiet btn-small" onClick={() => setConfirm(null)}>
              Batal
            </button>
          </div>
        ) : (
          <>
            <p className="field-hint">Semua pertemuan dan kode yang tersimpan ikut terhapus.</p>
            <button className="btn btn-danger-outline btn-small" onClick={() => setConfirm("delete-course")}>
              Hapus mata kuliah ini
            </button>
          </>
        )}
      </section>
    </section>
  );
}

function MeetingRow({ meeting, confirming, onRename, onToggleVisible, onAskDelete, onCancelDelete, onDelete, onOpen }) {
  const [editing, setEditing] = useState(null);
  const status = meeting.status === "live" && !meeting.teacherConnected ? "finished" : meeting.status;
  const openDisabledReason =
    meeting.status === "draft" ? "Belum pernah dimulai" : !meeting.visible ? "Tampilkan dulu untuk membuka" : undefined;
  const meta = [
    meeting.startedAt && formatDateTime(meeting.startedAt),
    meeting.continuesFrom && `lanjutan pertemuan ${meeting.continuesFrom.number}`,
  ].filter(Boolean);

  return (
    <li className={meeting.visible ? "admin-meeting" : "admin-meeting is-hidden"}>
      <div className="admin-meeting-main">
        <span className="meeting-label">
          Pertemuan {meeting.number}
          {!meeting.visible && " (disembunyikan)"}
        </span>
        {editing === null ? (
          <button className="title-button" onClick={() => setEditing(meeting.title)}>
            {meeting.title || <span className="placeholder-text">Tanpa judul</span>}
            <span className="visually-hidden">, ubah judul</span>
          </button>
        ) : (
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              onRename(editing.trim());
              setEditing(null);
            }}>
            <label className="visually-hidden" htmlFor={`title-${meeting.id}`}>
              Judul pertemuan {meeting.number}
            </label>
            <input
              id={`title-${meeting.id}`}
              value={editing}
              onChange={(event) => setEditing(event.target.value)}
              maxLength={200}
              autoFocus
            />
            <button className="btn btn-primary btn-small" type="submit">
              Simpan
            </button>
            <button className="btn btn-quiet btn-small" type="button" onClick={() => setEditing(null)}>
              Batal
            </button>
          </form>
        )}
        {meta.length > 0 && <span className="meeting-meta">{meta.join(", ")}</span>}
      </div>

      <div className="admin-meeting-controls">
        <StatusStamp status={status} />
        <label className="check">
          <input type="checkbox" checked={meeting.visible} onChange={onToggleVisible} />
          <span>Terlihat mahasiswa</span>
        </label>
        {confirming ? (
          <div className="confirm" role="group" aria-label={`Konfirmasi hapus pertemuan ${meeting.number}`}>
            <span className="confirm-text">Hapus permanen?</span>
            <button className="btn btn-danger btn-small" onClick={onDelete}>
              Ya, hapus
            </button>
            <button className="btn btn-quiet btn-small" onClick={onCancelDelete}>
              Batal
            </button>
          </div>
        ) : (
          <div className="button-row">
            <button className="btn btn-secondary btn-small" onClick={onOpen} disabled={Boolean(openDisabledReason)} title={openDisabledReason}>
              Buka
            </button>
            <button
              className="btn btn-quiet btn-small"
              onClick={onAskDelete}
              disabled={meeting.teacherConnected}
              title={meeting.teacherConnected ? "Hentikan sesi dari VS Code dulu" : undefined}>
              Hapus
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
