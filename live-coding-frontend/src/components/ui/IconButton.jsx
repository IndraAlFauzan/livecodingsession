import { forwardRef } from "react";
import Icon from "./Icon.jsx";

const IconButton = forwardRef(function IconButton({ icon, label, variant, size, dot, className, ...rest }, ref) {
  const classes = ["lc-iconbtn", variant && `lc-iconbtn--${variant}`, size && `lc-iconbtn--${size}`, className];
  return (
    <button type="button" {...rest} ref={ref} className={classes.filter(Boolean).join(" ")} aria-label={label} title={label}>
      <Icon name={icon} />
      {dot && <span className="lc-iconbtn__dot" />}
    </button>
  );
});

export default IconButton;
