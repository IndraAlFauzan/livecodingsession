import Icon from "./Icon.jsx";

export default function Card({ title, icon, actions, flush, className, style, children, ...rest }) {
  return (
    <section {...rest} className={["lc-card", flush && "lc-card--flush", className].filter(Boolean).join(" ")} style={style}>
      {(title || icon) && (
        <header className="lc-card__head">
          {icon && (
            <span className="lc-card__icon">
              <Icon name={icon} />
            </span>
          )}
          <h3 className="lc-card__title">{title}</h3>
          {actions && <div className="lc-card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
