import { Link } from "react-router-dom";

export function copyrightText() {
  return `Copyright © ${new Date().getFullYear()} OCH, Software Engineering Study Program`;
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>{copyrightText()}</p>
    </footer>
  );
}

export default function PageShell({ width = "default", label, actions, children }) {
  return (
    <div className="shell">
      <header className="site-header">
        <div className={`site-header-inner width-${width}`}>
          <Link className="wordmark" to="/">
            Live Coding Classroom
          </Link>
          {label && <span className="site-label">{label}</span>}
          {actions && <div className="site-actions">{actions}</div>}
        </div>
      </header>

      <main className={`shell-main width-${width}`}>{children}</main>

      <SiteFooter />
    </div>
  );
}
