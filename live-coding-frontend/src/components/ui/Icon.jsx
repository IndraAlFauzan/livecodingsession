// Set ikon garis: grid 24px, stroke 1.75, ujung membulat, mewarisi currentColor.
const PATHS = {
  grid: [["rect", { x: 3.5, y: 3.5, width: 7, height: 7, rx: 2 }], ["rect", { x: 13.5, y: 3.5, width: 7, height: 7, rx: 2 }], ["rect", { x: 3.5, y: 13.5, width: 7, height: 7, rx: 2 }], ["rect", { x: 13.5, y: 13.5, width: 7, height: 7, rx: 2 }]],
  book: [["path", { d: "M5 17V6a3 3 0 0 1 3-3h11v14H8a3 3 0 0 0-3 3 3 3 0 0 0 3 3h11v-6" }]],
  calendar: [["rect", { x: 3.5, y: 5, width: 17, height: 15.5, rx: 3 }], ["path", { d: "M3.5 10h17M8 3v4M16 3v4" }]],
  users: [["circle", { cx: 9, cy: 8, r: 3.5 }], ["path", { d: "M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.6a5.5 5.5 0 0 1 3.5 5.4" }]],
  code: [["path", { d: "M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15" }]],
  settings: [["path", { d: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" }], ["circle", { cx: 15, cy: 6, r: 2 }], ["circle", { cx: 9, cy: 12, r: 2 }], ["circle", { cx: 17, cy: 18, r: 2 }]],
  bell: [["path", { d: "M6 9.5a6 6 0 0 1 12 0c0 5.5 2.5 7 2.5 7h-17S6 15 6 9.5zM10 20a2 2 0 0 0 4 0" }]],
  search: [["circle", { cx: 11, cy: 11, r: 6.5 }], ["path", { d: "M16 16l4.5 4.5" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  copy: [["rect", { x: 8.5, y: 8.5, width: 12, height: 12, rx: 2.5 }], ["path", { d: "M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" }]],
  eye: [["path", { d: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" }], ["circle", { cx: 12, cy: 12, r: 3 }]],
  "eye-off": [["path", { d: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" }], ["path", { d: "M4 4l16 16" }]],
  trash: [["path", { d: "M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5M14 11v5" }]],
  play: [["path", { d: "M8 5v14l11-7z" }]],
  stop: [["rect", { x: 6.5, y: 6.5, width: 11, height: 11, rx: 2 }]],
  folder: [["path", { d: "M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" }]],
  file: [["path", { d: "M6 3.5h8l4.5 4.5v12.5H6zM14 3.5V8h4.5" }]],
  "chevron-down": [["path", { d: "M6 9.5l6 6 6-6" }]],
  "chevron-right": [["path", { d: "M9.5 6l6 6-6 6" }]],
  "chevron-left": [["path", { d: "M14.5 6l-6 6 6 6" }]],
  "chevrons-ud": [["path", { d: "M8 9.5l4-4 4 4M8 14.5l4 4 4-4" }]],
  more: [["circle", { cx: 5.5, cy: 12, r: 1.2 }], ["circle", { cx: 12, cy: 12, r: 1.2 }], ["circle", { cx: 18.5, cy: 12, r: 1.2 }]],
  refresh: [["path", { d: "M20 11.5A8 8 0 1 1 17.7 6M20 4v5h-5" }]],
  clock: [["circle", { cx: 12, cy: 12, r: 8.5 }], ["path", { d: "M12 7.5V12l3 2" }]],
  key: [["circle", { cx: 8, cy: 15.5, r: 4 }], ["path", { d: "M11 12.5l9-9M16.5 7l2.5 2.5" }]],
  radio: [["circle", { cx: 12, cy: 12, r: 2 }], ["path", { d: "M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6" }]],
  check: [["path", { d: "M5 12.5l4.5 4.5L19 7.5" }]],
  x: [["path", { d: "M6.5 6.5l11 11M17.5 6.5l-11 11" }]],
  shield: [["path", { d: "M12 3.5l7.5 3v5.5c0 4.2-3.2 7.6-7.5 8.5-4.3-.9-7.5-4.3-7.5-8.5V6.5z" }]],
  link: [["path", { d: "M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" }]],
  logout: [["path", { d: "M14.5 4h4a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-4M10 8l-4 4 4 4M6 12h10" }]],
  save: [["path", { d: "M5.5 3.5h10l3 3v12a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" }], ["path", { d: "M8 3.5v4.5h7V3.5M8 20.5v-6h8v6" }]],
  highlight: [["path", { d: "M4 6h16M4 10h10M4 14h16M4 18h7" }]],
  login: [["path", { d: "M9.5 4h-4A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h4M14 8l4 4-4 4M18 12H8" }]],
  // Digambar di grid yang sama; dipakai tombol drawer di bawah 1024px.
  menu: [["path", { d: "M4 7h16M4 12h16M4 17h16" }]],
};

export default function Icon({ name, size, className }) {
  const parts = PATHS[name] || PATHS.grid;
  const filled = name === "more" || name === "play";
  return (
    <svg
      className={["lc-ico", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}>
      {parts.map(([Tag, attrs], index) => (
        <Tag key={index} {...attrs} {...(filled ? { fill: "currentColor" } : null)} />
      ))}
    </svg>
  );
}
