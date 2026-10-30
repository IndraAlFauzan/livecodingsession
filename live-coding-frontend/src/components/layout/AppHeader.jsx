import Avatar from "../ui/Avatar.jsx";
import Badge from "../ui/Badge.jsx";
import IconButton from "../ui/IconButton.jsx";
import { useDrawer } from "./AppLayout.jsx";

export default function AppHeader({ crumb, title, live, badge, meta, user, userTone, actions }) {
  const drawer = useDrawer();
  return (
    <header className="lc-header">
      {drawer && (
        <IconButton icon="menu" label="Buka navigasi" className="lc-header__menu" onClick={drawer.open} />
      )}
      <div className="lc-header__crumbs">
        {crumb && <small>{crumb}</small>}
        <strong>{title}</strong>
      </div>
      {meta && <div className="lc-header__meta">{meta}</div>}
      {badge || (live && <Badge status="live" />)}
      {actions && <div className="lc-header__actions">{actions}</div>}
      {user && (
        <span className="lc-header__user">
          <Avatar name={user} tone={userTone} />
          {user}
        </span>
      )}
    </header>
  );
}
