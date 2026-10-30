import { useId } from "react";
import Icon from "./Icon.jsx";

export default function TextField({ label, hint, error, icon, mono, search, kbd, className, id, ...input }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const describedBy = hint || error ? `${fieldId}-desc` : undefined;

  const box = (
    <div
      className={["lc-input", mono && "lc-input--mono", search && "lc-input--search", error && "lc-input--error"]
        .filter(Boolean)
        .join(" ")}>
      {(icon || search) && <Icon name={icon || "search"} />}
      <input {...input} id={fieldId} aria-describedby={describedBy} aria-invalid={error ? "true" : undefined} />
      {kbd && <span className="lc-kbd">{kbd}</span>}
    </div>
  );

  if (!label) {
    return (
      <label className={className} htmlFor={fieldId}>
        <span className="lc-sr">{input.placeholder}</span>
        {box}
      </label>
    );
  }

  return (
    <div className={["lc-field", className].filter(Boolean).join(" ")}>
      <label className="lc-field__label" htmlFor={fieldId}>
        {label}
      </label>
      {box}
      {error ? (
        <span className="lc-field__error" id={describedBy} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span className="lc-field__hint" id={describedBy}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
