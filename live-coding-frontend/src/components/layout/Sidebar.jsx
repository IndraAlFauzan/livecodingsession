import Badge from "../ui/Badge.jsx";
import Icon from "../ui/Icon.jsx";
import IconButton from "../ui/IconButton.jsx";

const SWATCH = { violet: "var(--violet)", lime: "var(--lime)", pink: "var(--pink)", amber: "var(--amber)", sky: "var(--sky)" };
const TONES = Object.keys(SWATCH);

// Warna penanda tetap sama untuk nama yang sama, tanpa perlu disimpan di server.
export function toneForCourse(name) {
  const text = String(name || "");
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return TONES[sum % TONES.length];
}

export default function Sidebar({
  logoSrc,
  workspace,
  menu = [],
  courses,
  coursesLabel = "Mata kuliah",
  addLabel = "Mata kuliah baru",
  currentCourseId,
  onSelectCourse,
  onAddCourse,
  children,
}) {
  return (
    <nav className="lc-sidebar" aria-label="Navigasi utama">
      <div className="lc-sidebar__brand">
        {logoSrc ? <img className="lc-sidebar__logo" src={logoSrc} alt="" /> : <span className="lc-avatar lc-avatar--ink">LC</span>}
        <div className="lc-sidebar__name">
          Live Coding
          <small>{workspace || "Ruang dosen"}</small>
        </div>
      </div>

      {menu.length > 0 && (
        <div className="lc-sidebar__section">
          <div className="lc-sidebar__label">Menu</div>
          {menu.map((item) => (
            <button
              key={item.label}
              type="button"
              className="lc-nav"
              aria-current={item.current ? "page" : undefined}
              onClick={item.onClick}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.count != null && <span className="lc-count">{item.count}</span>}
            </button>
          ))}
        </div>
      )}

      {courses && (
        <div className="lc-sidebar__section">
          <div className="lc-sidebar__label">
            {coursesLabel}
            {onAddCourse && <IconButton icon="plus" label={addLabel} variant="plain" size="sm" onClick={onAddCourse} />}
          </div>
          {children}
          {courses.length === 0 && !children && <p className="lc-muted lc-sidebar__note">Belum ada mata kuliah.</p>}
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              className="lc-nav"
              aria-current={course.id === currentCourseId ? "page" : undefined}
              onClick={() => onSelectCourse?.(course.id)}>
              <span className="lc-nav__swatch" style={{ background: SWATCH[toneForCourse(course.name)] }} />
              <span>{course.name}</span>
              {course.live ? (
                <Badge status="live" size="sm" />
              ) : (
                course.meetingCount != null && <span className="lc-count">{course.meetingCount}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
