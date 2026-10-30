import Badge from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";
import Icon from "../ui/Icon.jsx";
import { useElapsed } from "../../utils/elapsed.js";

export default function MeetingCard({ number, status, continuesFrom, title, date, startedAt, action }) {
  const time = useElapsed(startedAt, status === "live");

  return (
    <Card>
      <div className="lc-meeting__top">
        <span className="lc-meeting__no">Pertemuan {number}</span>
        <Badge status={status} />
        {continuesFrom && (
          <Badge tone="violet" size="sm">
            Lanjutan P{continuesFrom}
          </Badge>
        )}
      </div>
      <div>
        <h3 className="lc-meeting__title">{title || `Pertemuan ${number}`}</h3>
      </div>
      {(date || time) && (
        <div className="lc-meeting__foot">
          {time && (
            <span className="lc-meeting__clock" title="Sudah berjalan">
              <Icon name="radio" />
              {time}
            </span>
          )}
          {date && (
            <span>
              <Icon name="clock" />
              {date}
            </span>
          )}
        </div>
      )}
      {action && <div className="lc-meeting__action">{action}</div>}
    </Card>
  );
}
