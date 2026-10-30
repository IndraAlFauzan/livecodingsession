import { useCallback, useEffect, useState } from "react";
import AccessCodeCard from "./AccessCodeCard.jsx";
import LiveSessionCard from "./LiveSessionCard.jsx";
import MeetingCard from "./MeetingCard.jsx";
import MeetingDetail from "./MeetingDetail.jsx";
import MeetingTable from "./MeetingTable.jsx";
import ViewerList from "./ViewerList.jsx";
import AppHeader from "../layout/AppHeader.jsx";
import { Button, Card, Dialog, EmptyState, IconButton, Tabs, TextField } from "../ui/index.js";
import { formatDateTime } from "../../lib/api.js";
import { storage } from "../../lib/storage.js";
import { derivedStatus, isRunning } from "../../utils/meetingStatus.js";
import { MEETING_REFRESH_MS, FILTERS } from "./adminConstants.js";

export default function CourseDetail({ api, course, onError, onCourseChanged, onLogout }) {
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
      const running = list.find(isRunning);
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
