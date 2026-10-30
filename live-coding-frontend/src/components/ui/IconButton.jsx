import Icon from "./Icon.jsx";

export default function IconButton({ icon, label, variant, size, dot, className, ...rest }) {
  const classes = ["lc-iconbtn", variant && `lc-iconbtn--${variant}`, size && `lc-iconbtn--${size}`, className];
  return (
    <button type="button" {...rest} className={classes.filter(Boolean).join(" ")} aria-label={label} title={label}>
      <Icon name={icon} />
      {dot && <span className="lc-iconbtn__dot" />}
    </button>
  );
}
