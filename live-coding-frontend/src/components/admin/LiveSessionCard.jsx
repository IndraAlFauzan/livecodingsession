import Badge from "../ui/Badge.jsx";
import Icon from "../ui/Icon.jsx";
import { useElapsed } from "../../utils/elapsed.js";

export default function LiveSessionCard({ live, number, title, startedAt }) {
  const time = useElapsed(startedAt, live);

  if (!live) {
    return (
      <section className="lc-live lc-live--idle">
        <div className="lc-live__head">
          <span className="lc-card__icon">
            <Icon name="radio" />
          </span>
          <h3 className="lc-live__title">Sesi live</h3>
        </div>
        <p className="lc-live__meta">Tidak ada sesi berjalan. Mulai dari VS Code: Live Coding: Start Session.</p>
      </section>
    );
  }

  return (
    <section className="lc-live">
      <div className="lc-live__head">
        <span className="lc-card__icon">
          <Icon name="radio" />
        </span>
        <h3 className="lc-live__title">Sedang live</h3>
        <Badge status="live" />
      </div>
      <p className="lc-live__meta">{[`Pertemuan ${number}`, title].filter(Boolean).join(" · ")}</p>
      <div className="lc-live__time">{time && <span className="lc-live__clock">{time}</span>}</div>
      <p className="lc-live__note">Hentikan dari VS Code</p>
    </section>
  );
}
