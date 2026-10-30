import { useEffect, useState } from "react";

// Jam sesi dihitung di klien; server tidak mengirim durasi, hanya waktu mulai.
export function formatElapsed(startedAt) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  const total = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function useElapsed(startedAt, running = true) {
  const active = Boolean(running && startedAt);
  const [time, setTime] = useState(() => (active ? formatElapsed(startedAt) : null));

  useEffect(() => {
    if (!active) {
      setTime(null);
      return undefined;
    }
    setTime(formatElapsed(startedAt));
    const timer = setInterval(() => setTime(formatElapsed(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [active, startedAt]);

  return time;
}
