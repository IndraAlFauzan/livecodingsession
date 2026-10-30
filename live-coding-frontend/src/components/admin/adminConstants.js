export const MEETING_REFRESH_MS = 10000;

export const FILTERS = [
  { label: "Semua", match: () => true },
  { label: "Live", match: (status) => status === "live" },
  { label: "Selesai", match: (status) => status === "finished" },
  { label: "Belum dimulai", match: (status) => status === "draft" },
];
