export function copyrightText() {
  return `Copyright © ${new Date().getFullYear()} OCH, Software Engineering Study Program`;
}

export default function Copyright({ className }) {
  return <p className={["lc-copyright", className].filter(Boolean).join(" ")}>{copyrightText()}</p>;
}
