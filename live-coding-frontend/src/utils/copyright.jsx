export function copyrightText() {
  return `Copyright © ${new Date().getFullYear()} OCH, Rekayasa Perangkat Lunak, Telkom University`;
}

export default function Copyright({ className }) {
  return <p className={["lc-copyright", className].filter(Boolean).join(" ")}>{copyrightText()}</p>;
}
