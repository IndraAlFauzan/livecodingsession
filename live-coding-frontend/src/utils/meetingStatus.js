// Pertemuan yang ditandai live tapi dosennya tidak terhubung sudah selesai.
// Selama masa tenggang dosen masih ditunggu, jadi tetap dihitung live.
export function derivedStatus(meeting) {
  const connected = meeting.teacherConnected || meeting.reconnecting;
  return meeting.status === "live" && !connected ? "finished" : meeting.status;
}

export function isRunning(meeting) {
  return derivedStatus(meeting) === "live";
}
