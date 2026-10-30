import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Icon from "../ui/Icon.jsx";
import { toneForCourse } from "../layout/Sidebar.jsx";

export default function CourseCard({ name, detail, live, meetingCount, onOpen, onJoinLive, onLeave }) {
  const tone = toneForCourse(name);
  return (
    <Card className="lc-course">
      <div className="lc-meeting__top">
        <span
          className="lc-course__swatch"
          style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-ink)` }}>
          <Icon name="book" />
        </span>
        {live ? (
          <Badge status="live" />
        ) : (
          meetingCount != null && (
            <Badge tone="neutral">
              {meetingCount} pertemuan
            </Badge>
          )
        )}
      </div>

      <div>
        <h3 className="lc-course__name">{name}</h3>
        {detail && <p className="lc-course__meta">{detail}</p>}
      </div>

      <div className="lc-course__actions">
        {live && (
          <Button variant="violet" block icon="radio" onClick={onJoinLive}>
            Ikuti sesi live
          </Button>
        )}
        <Button variant="secondary" block onClick={onOpen}>
          Buka
        </Button>
        <Button variant="ghost" size="sm" block onClick={onLeave}>
          Keluar dari kelas
        </Button>
      </div>
    </Card>
  );
}
