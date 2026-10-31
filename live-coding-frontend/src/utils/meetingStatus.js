// Pertemuan yang ditandai live tapi dosennya tidak terhubung sudah selesai.
// Selama masa tenggang dosen masih ditunggu, jadi tetap dihitung live.
export function derivedStatus(meeting) {
  const connected = meeting.teacherConnected || meeting.reconnecting;
  return meeting.status === "live" && !connected ? "finished" : meeting.status;
}

export function isRunning(meeting) {
  return derivedStatus(meeting) === "live";
}

// Satu tempat yang menentukan ke mana tombol "buka pertemuan" mengarah, supaya
// pilihan layar penuh mahasiswa dihormati dari halaman mana pun.
export function meetingPath(slug, meetingId, focus) {
  return focus ? `/fokus/mk/${slug}/p/${meetingId}` : `/mk/${slug}/p/${meetingId}`;
}

// Dipakai di beranda dan daftar mata kuliah, jadi penamaannya seragam.
export function meetingName(meeting) {
  if (!meeting) return "";
  return meeting.title ? `Pertemuan ${meeting.number}, ${meeting.title}` : `Pertemuan ${meeting.number}`;
}
