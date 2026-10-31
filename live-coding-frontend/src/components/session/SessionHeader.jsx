import Avatar from "../ui/Avatar.jsx";
import Brand from "../layout/Brand.jsx";
import Badge from "../ui/Badge.jsx";
import { useElapsed } from "../../utils/elapsed.js";

// Title bar jendela IDE: menempel di atas Explorer dan editor, bukan kartu terpisah.
export default function SessionHeader({ crumb, title, isLive, hasMeeting, startedAt, meta, student, actions }) {
  const time = useElapsed(startedAt, isLive);

  return (
    <header className="lc-titlebar">
      <Brand markOnly />
      <div className="lc-titlebar__id">
        <span className="lc-titlebar__crumb">{crumb}</span>
        <strong className="lc-titlebar__title">{title}</strong>
      </div>

      {hasMeeting && <Badge status={isLive ? "live" : "finished"} />}
      {time && (
        <span className="lc-titlebar__clock" title="Sesi sudah berjalan">
          {time}
        </span>
      )}

      <span className="lc-titlebar__spacer" />

      {meta}
      {actions}
      <span className="lc-titlebar__user">
        <Avatar name={student} size="sm" />
        {student}
      </span>
    </header>
  );
}
