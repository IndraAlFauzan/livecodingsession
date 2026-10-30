const TONES = ["violet", "lime", "pink", "amber", "sky"];

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function toneFor(name) {
  const text = String(name);
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return TONES[sum % TONES.length];
}

export default function Avatar({ name, tone, size, online }) {
  const classes = ["lc-avatar", `lc-avatar--${tone || toneFor(name)}`, size && `lc-avatar--${size}`];
  return (
    <span className={classes.filter(Boolean).join(" ")} title={name}>
      {initials(name)}
      {online && <i className="lc-avatar__online" />}
    </span>
  );
}

export function AvatarStack({ people = [], total, max = 4, size = "sm" }) {
  const extra = (total || people.length) - Math.min(max, people.length);
  return (
    <span className="lc-avatars">
      {people.slice(0, max).map((name) => (
        <Avatar key={name} name={name} size={size} />
      ))}
      {extra > 0 && <span className="lc-avatars__more">{`+${extra}`}</span>}
    </span>
  );
}
