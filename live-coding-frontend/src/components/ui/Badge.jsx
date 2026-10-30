const STATUS = {
  live: ["live", "Live", true],
  finished: ["neutral", "Selesai"],
  draft: ["amber", "Belum dimulai"],
  active: ["lime", "Aktif", true],
  inactive: ["red", "Nonaktif"],
  new: ["lime", "Baru"],
  modified: ["amber", "Diubah"],
  teacher: ["ink", "Dosen"],
  hidden: ["neutral", "Disembunyikan"],
};

export default function Badge({ status, tone, dot, size, children }) {
  const preset = status && STATUS[status];
  const classes = ["lc-badge", `lc-badge--${preset ? preset[0] : tone || "neutral"}`, size === "sm" && "lc-badge--sm"];
  return (
    <span className={classes.filter(Boolean).join(" ")}>
      {(preset ? preset[2] : dot) && <i className="lc-badge__dot" />}
      {preset ? preset[1] : children}
    </span>
  );
}
