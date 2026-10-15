export default function StatusBar({ connectionStatus, sessionId, activeFile, studentCount }) {
  return (
    <footer className="status-bar">
      <span className={`connection ${connectionStatus}`}>{connectionStatus}</span>
      <span>Session: <strong>{sessionId}</strong></span>
      <span>Dosen membuka: <strong>{activeFile || "-"}</strong></span>
      {typeof studentCount === "number" && <span>Viewer: <strong>{studentCount}</strong></span>}
    </footer>
  );
}
