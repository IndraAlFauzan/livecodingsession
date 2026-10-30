import { useEffect, useState } from "react";
import Badge from "../ui/Badge.jsx";
import Icon from "../ui/Icon.jsx";

function elapsed(startedAt) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  const total = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export default function LiveSessionCard({ live, number, title, startedAt }) {
  // Jam berjalan dihitung di klien; server tidak mengirim durasi.
  const [time, setTime] = useState(() => (live && startedAt ? elapsed(startedAt) : null));

  useEffect(() => {
    if (!live || !startedAt) {
      setTime(null);
      return undefined;
    }
    setTime(elapsed(startedAt));
    const timer = setInterval(() => setTime(elapsed(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [live, startedAt]);

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
      <div className="lc-live__time">
        {time && <span className="lc-live__clock">{time}</span>}
      </div>
      <p className="lc-live__note">Hentikan dari VS Code</p>
    </section>
  );
}
