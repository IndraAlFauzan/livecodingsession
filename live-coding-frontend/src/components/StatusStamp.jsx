const LABELS = {
  draft: "Belum dimulai",
  live: "Live",
  finished: "Selesai",
  active: "Aktif",
  inactive: "Nonaktif",
};

export default function StatusStamp({ status }) {
  return <span className={`stamp stamp-${status}`}>{LABELS[status]}</span>;
}
