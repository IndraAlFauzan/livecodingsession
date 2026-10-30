import Icon from "./Icon.jsx";

export default function EmptyState({ icon = "calendar", title, text, action }) {
  return (
    <div className="lc-empty">
      <span className="lc-empty__icon">
        <Icon name={icon} />
      </span>
      <p className="lc-empty__title">{title}</p>
      {text && <p className="lc-empty__text">{text}</p>}
      {action}
    </div>
  );
}
