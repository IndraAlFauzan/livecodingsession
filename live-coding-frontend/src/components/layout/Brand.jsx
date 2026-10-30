import { Link } from "react-router-dom";

// Lockup merek: mark + wordmark. Dipakai di pintu masuk dan kepala halaman mahasiswa.
export default function Brand({ size = "md", markOnly = false, to = "/", className }) {
  const classes = ["lc-brand", `lc-brand--${size}`, markOnly && "lc-brand--mark", className];
  const inner = (
    <>
      <img className="lc-brand__mark" src="/live-coding-mark.svg" alt="" width="64" height="64" />
      {!markOnly && (
        <span className="lc-brand__text">
          <strong>Live Coding</strong>
          <small>Classroom</small>
        </span>
      )}
    </>
  );

  if (!to) {
    return (
      <span className={classes.filter(Boolean).join(" ")}>
        {inner}
        {markOnly && <span className="lc-sr">Live Coding Classroom</span>}
      </span>
    );
  }

  return (
    <Link className={classes.filter(Boolean).join(" ")} to={to} aria-label="Live Coding Classroom, ke beranda">
      {inner}
    </Link>
  );
}
