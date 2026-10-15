import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { STATUS_LABEL, adminApi, formatDateTime } from "../lib/api.js";
import { storage } from "../lib/storage.js";

const MEETING_REFRESH_MS = 10000;

export default function AdminPage() {
  const [token, setToken] = useState(() => storage.getAdminToken());
  const api = useMemo(() => (token ? adminApi(token) : null), [token]);

  function logout() {
    storage.setAdminToken(null);
    setToken(null);
  }

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
      setError(err.status === 401 ? "Token dosen salah." : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <h1>Admin Dosen</h1>
        <p className="muted">Masuk dengan teacher token yang sama seperti di backend dan VS Code.</p>
      </header>
      <section className="card">
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Teacher token</span>
            <input type="password" value={value} onChange={(event) => setValue(event.target.value)} autoFocus />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting || !value.trim()}>
            {submitting ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AdminDashboard({ api, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get("mk")) || null;
  const setSelectedId = useCallback(
    (id) => setSearchParams({ mk: String(id) }, { replace: true }),
    [setSearchParams],
  );
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
      const { courses: list } = await api.courses();
      setCourses(list);
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

  const selected = courses.find((course) => course.id === selectedId) || courses[0] || null;

  return (
    <div className="page page-wide">
      <header className="page-header page-header-row">
        <div>
          <h1>Admin Dosen</h1>
          <p className="muted">Kelola mata kuliah, kode akses, dan pertemuan.</p>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>
          Keluar
        </button>
      </header>

      {error && (
        <div className="banner banner-error">
          <span>{error}</span>
          <button className="btn btn-ghost btn-small" onClick={() => setError(null)}>
            Tutup
          </button>
        </div>
      )}

      <div className="admin-grid">
        <aside className="card admin-courses">
          <h2 className="card-title">Mata kuliah</h2>
          <ul className="course-list">
            {courses.map((course) => (
              <li key={course.id}>
                <button
                  className={course.id === selected?.id ? "course-item selected" : "course-item"}
                  onClick={() => setSelectedId(course.id)}>
                  <span>{course.name}</span>
                  <small>{course.meetingCount} pertemuan</small>
                </button>
              </li>
            ))}
          </ul>
          {courses.length === 0 && <p className="muted">Belum ada mata kuliah.</p>}

          <form className="inline-form" onSubmit={createCourse}>
            <input
              value={newCourseName}
              onChange={(event) => setNewCourseName(event.target.value)}
              placeholder="Nama mata kuliah baru"
              maxLength={100}
            />
            <button className="btn btn-primary" type="submit" disabled={!newCourseName.trim()}>
              Tambah
            </button>
          </form>
        </aside>

        {selected ? (
          <CourseDetail
            key={selected.id}
            api={api}
            course={selected}
            onError={handleError}
            onCourseChanged={loadCourses}
          />
        ) : (
          <section className="card empty-state">Tambahkan mata kuliah untuk mulai.</section>
        )}
      </div>
    </div>
  );
}

function CourseDetail({ api, course, onError, onCourseChanged }) {
  const [meetings, setMeetings] = useState([]);
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
    } catch (err) {
      onError(err);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(course.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard tidak diizinkan; kode tetap terlihat di layar.
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
    run(async () => {
      await api.createMeeting(course.id, title ? { title } : {});
      setNewMeetingTitle("");
    }, { reloadCourses: true });
  }

  return (
    <section className="admin-detail">
      <div className="card">
        {editingName === null ? (
          <div className="detail-heading">
            <h2>{course.name}</h2>
            <button className="btn btn-ghost btn-small" onClick={() => setEditingName(course.name)}>
              Ubah nama
            </button>
          </div>
        ) : (
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => api.updateCourse(course.id, { name: editingName }), { reloadCourses: true }).then(() =>
                setEditingName(null),
              );
            }}>
            <input value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={100} autoFocus />
            <button className="btn btn-primary" type="submit" disabled={!editingName.trim()}>
              Simpan
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditingName(null)}>
              Batal
            </button>
          </form>
        )}

        <div className="access-code">
          <div>
            <span className="muted">Kode akses mahasiswa</span>
            <div className="access-code-value">
              <code className={course.codeActive ? "" : "inactive"}>{course.accessCode}</code>
              <span className={`pill ${course.codeActive ? "pill-finished" : "pill-draft"}`}>
                {course.codeActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
          <div className="button-row">
            <button className="btn btn-ghost btn-small" onClick={copyCode}>
              {copied ? "Tersalin" : "Salin"}
            </button>
            <button
              className="btn btn-ghost btn-small"
              onClick={() => run(() => api.updateCourse(course.id, { codeActive: !course.codeActive }), { reloadCourses: true })}>
              {course.codeActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
            {confirm === "regenerate" ? (
              <>
                <span className="confirm-text">Kode lama langsung tidak berlaku.</span>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => run(() => api.regenerateCode(course.id), { reloadCourses: true })}>
                  Ya, buat baru
                </button>
                <button className="btn btn-ghost btn-small" onClick={() => setConfirm(null)}>
                  Batal
                </button>
              </>
            ) : (
              <button className="btn btn-ghost btn-small" onClick={() => setConfirm("regenerate")}>
                Buat kode baru
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Pertemuan</h2>

        <form className="inline-form" onSubmit={createMeeting}>
          <input
            value={newMeetingTitle}
            onChange={(event) => setNewMeetingTitle(event.target.value)}
            placeholder="Judul pertemuan berikutnya (opsional)"
            maxLength={200}
          />
          <button className="btn btn-primary" type="submit">
            Tambah pertemuan
          </button>
        </form>

        {meetings.length === 0 ? (
          <p className="muted">Belum ada pertemuan. Pertemuan juga bisa dibuat langsung dari VS Code.</p>
        ) : (
          <div className="table-wrap">
            <table className="meeting-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Judul</th>
                  <th>Status</th>
                  <th>Tampil</th>
                  <th aria-label="Aksi"></th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((meeting) => (
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
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card danger-zone">
        {confirm === "delete-course" ? (
          <div className="button-row">
            <span className="confirm-text">
              Hapus {course.name} beserta {meetings.length} pertemuan dan semua kodenya? Tidak bisa dibatalkan.
            </span>
            <button
              className="btn btn-danger btn-small"
              onClick={() => run(() => api.deleteCourse(course.id), { reloadCourses: true })}>
              Ya, hapus permanen
            </button>
            <button className="btn btn-ghost btn-small" onClick={() => setConfirm(null)}>
              Batal
            </button>
          </div>
        ) : (
          <button className="btn btn-danger-outline btn-small" onClick={() => setConfirm("delete-course")}>
            Hapus mata kuliah
          </button>
        )}
      </div>
    </section>
  );
}

function MeetingRow({ meeting, confirming, onRename, onToggleVisible, onAskDelete, onCancelDelete, onDelete, onOpen }) {
  const [editing, setEditing] = useState(null);
  const status = meeting.status === "live" && !meeting.teacherConnected ? "finished" : meeting.status;

  return (
    <tr className={meeting.visible ? "" : "row-hidden"}>
      <td className="cell-number">{meeting.number}</td>
      <td>
        {editing === null ? (
          <button className="link-button" onClick={() => setEditing(meeting.title)} title="Klik untuk mengubah judul">
            {meeting.title || <span className="muted">Tanpa judul</span>}
          </button>
        ) : (
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              onRename(editing.trim());
              setEditing(null);
            }}>
            <input value={editing} onChange={(event) => setEditing(event.target.value)} maxLength={200} autoFocus />
            <button className="btn btn-primary btn-small" type="submit">
              Simpan
            </button>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => setEditing(null)}>
              Batal
            </button>
          </form>
        )}
        {meeting.continuesFrom && (
          <div className="meeting-meta">↳ Lanjutan dari Pertemuan {meeting.continuesFrom.number}</div>
        )}
        {meeting.startedAt && <div className="meeting-meta">{formatDateTime(meeting.startedAt)}</div>}
      </td>
      <td>
        <span className={`pill pill-${status}`}>{STATUS_LABEL[status]}</span>
      </td>
      <td>
        <label className="switch" title={meeting.visible ? "Terlihat oleh mahasiswa" : "Disembunyikan"}>
          <input type="checkbox" checked={meeting.visible} onChange={onToggleVisible} />
          <span>{meeting.visible ? "Ya" : "Tidak"}</span>
        </label>
      </td>
      <td className="cell-actions">
        {confirming ? (
          <>
            <button className="btn btn-danger btn-small" onClick={onDelete}>
              Ya, hapus
            </button>
            <button className="btn btn-ghost btn-small" onClick={onCancelDelete}>
              Batal
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-ghost btn-small"
              onClick={onOpen}
              disabled={meeting.status === "draft" || !meeting.visible}
              title={meeting.status === "draft" ? "Belum pernah dimulai" : !meeting.visible ? "Tampilkan dulu untuk membuka" : undefined}>
              Buka
            </button>
            <button
              className="btn btn-ghost btn-small"
              onClick={onAskDelete}
              disabled={meeting.teacherConnected}
              title={meeting.teacherConnected ? "Hentikan sesi dari VS Code dulu" : undefined}>
              Hapus
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
