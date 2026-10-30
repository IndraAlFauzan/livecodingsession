import Badge from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";
import Icon from "../ui/Icon.jsx";

export default function MeetingCard({ number, status, continuesFrom, title, date, action }) {
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
      {date && (
        <div className="lc-meeting__foot">
          <span>
            <Icon name="clock" />
            {date}
          </span>
        </div>
      )}
      {action && <div className="lc-meeting__action">{action}</div>}
    </Card>
  );
}
