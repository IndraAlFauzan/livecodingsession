export default function Switch({ label, checked = false, hideLabel, disabled, onChange }) {
  return (
    <label className="lc-switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className="lc-switch__track" aria-hidden="true" />
      {hideLabel ? <span className="lc-sr">{label}</span> : label}
    </label>
  );
}
