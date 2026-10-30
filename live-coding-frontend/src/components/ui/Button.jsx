import { forwardRef } from "react";
import Icon from "./Icon.jsx";

const Button = forwardRef(function Button(
  { variant = "primary", size, block, icon, iconRight, className, children, ...rest },
  ref,
) {
  const classes = ["lc-btn", `lc-btn--${variant}`, size && `lc-btn--${size}`, block && "lc-btn--block", className];
  return (
    <button type="button" {...rest} ref={ref} className={classes.filter(Boolean).join(" ")}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
});

export default Button;
