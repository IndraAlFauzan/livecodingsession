import { useNavigate } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader.jsx";
import { Badge, Button, Card, EmptyState, Icon } from "../components/ui/index.js";
import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import { formatDateTime } from "../lib/api.js";
import { storage } from "../lib/storage.js";
import { useElapsed } from "../utils/elapsed.js";
import { meetingName, meetingPath } from "../utils/meetingStatus.js";

function LiveCard({ course, onOpen, onFocus }) {
  const { live } = course;
  const jam = useElapsed(live.startedAt, !live.reconnecting);

  return (
    <Card className="lc-now">
      <div className="lc-now__top">
        <Badge status="live" />
        {jam && <span className="lc-now__clock">{jam}</span>}
        {live.reconnecting && <span className="lc-now__warn">Koneksi dosen terputus, menunggu tersambung lagi</span>}
      </div>
      <div>
        <h2 className="lc-now__course">{course.name}</h2>
        <p className="lc-now__meeting">{meetingName(live)}</p>
      </div>
      <div className="lc-now__actions">
        <Button variant="violet" icon="radio" onClick={onOpen}>
          Ikuti sesi
        </Button>
        <Button variant="secondary" icon="eye" onClick={onFocus}>
          Fokus
        </Button>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { student, courses, recent } = useStudentAuth();

  const live = courses.filter((course) => course.live);
  const belumPunya = courses.length === 0;

  const buka = (slug, id) => navigate(meetingPath(slug, id, storage.getFocusMode()));

  return (
    <>
      <AppHeader title="Beranda" crumb="Live Coding" user={student?.name} />

      <div className="lc-page__body">
        <div className="lc-pagehead">
          <div className="lc-pagehead__text">
            <h1 className="lc-h1">{student ? `Halo, ${student.name.split(" ")[0]}` : "Halo"}</h1>
            <p className="lc-sub">
              {belumPunya
                ? "Kamu belum mengikuti mata kuliah apa pun."
                : `${courses.length} mata kuliah diikuti.`}
            </p>
          </div>
        </div>

        {belumPunya ? (
          <Card>
            <EmptyState
              icon="book"
              title="Mulai dari kode akses dosen."
              text="Setelah bergabung sekali, mata kuliahnya tersimpan di akunmu dan muncul di sini."
              action={
                <Button icon="plus" onClick={() => navigate("/mk")}>
                  Gabung mata kuliah
                </Button>
              }
            />
          </Card>
        ) : live.length > 0 ? (
          <div className="lc-cards">
            {live.map((course) => (
              <LiveCard
                key={course.slug}
                course={course}
                onOpen={() => buka(course.slug, course.live.id)}
                onFocus={() => {
                  storage.setFocusMode(true);
                  navigate(meetingPath(course.slug, course.live.id, true));
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="lc-quiet">
            <span className="lc-quiet__icon">
              <Icon name="clock" />
            </span>
            <div>
              <strong>Tidak ada sesi yang sedang berlangsung.</strong>
              <p className="lc-muted">
                Halaman ini memeriksa ulang sendiri. Begitu dosen memulai sesi, kartunya muncul di sini.
              </p>
            </div>
          </Card>
        )}

        {recent.length > 0 && (
          <>
            <h2 className="lc-h2">Terakhir kamu buka</h2>
            <div className="lc-cards">
              {recent.map((item) => (
                <Card key={item.meeting.id} className="lc-recent">
                  <div className="lc-recent__top">
                    <span className="lc-recent__course">{item.course.name}</span>
                    <Badge tone="neutral" size="sm">
                      {item.meeting.status === "live" ? "Live" : "Selesai"}
                    </Badge>
                  </div>
                  <strong>{meetingName(item.meeting)}</strong>
                  <p className="lc-muted">Dibuka {formatDateTime(item.lastSeen)}</p>
                  <Button variant="secondary" size="sm" block onClick={() => buka(item.course.slug, item.meeting.id)}>
                    Buka lagi
                  </Button>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
