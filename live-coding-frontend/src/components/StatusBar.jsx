const CONNECTION_LABEL = {
  connecting: "Menghubungkan",
  connected: "Terhubung",
  disconnected: "Terputus, mencoba lagi",
};

export default function StatusBar({ connectionStatus, studentName, activeFile, isLive }) {
  return (
    <footer className="status-bar">
      <span className={`connection ${connectionStatus}`}>{CONNECTION_LABEL[connectionStatus]}</span>
      <span>
        Masuk sebagai: <strong>{studentName}</strong>
      </span>
      {isLive && (
        <span>
          Dosen membuka: <strong>{activeFile || "-"}</strong>
        </span>
      )}
    </footer>
  );
}
