import { copyrightText } from "../../utils/copyright.jsx";
import Avatar from "../ui/Avatar.jsx";
import Switch from "../ui/Switch.jsx";

const CONNECTION = {
  connecting: ["wait", "Menghubungkan"],
  connected: ["on", "Terhubung"],
  disconnected: ["wait", "Terputus, mencoba lagi"],
};

export default function SessionBar({ connectionStatus, teacherFile, follow, onFollowChange, student, isLive }) {
  const [tone, label] = CONNECTION[connectionStatus] || CONNECTION.connecting;

  return (
    <footer className="lc-sessionbar">
      <span className={`lc-conn lc-conn--${tone}`}>
        <i />
        {label}
      </span>

      {isLive && (
        <>
          <span className="lc-divider" />
          <span className="lc-sessionbar__info">
            Dosen membuka
            <strong className="lc-mono">{teacherFile || "-"}</strong>
          </span>
          <Switch label="Follow Dosen" checked={follow} onChange={onFollowChange} />
        </>
      )}

      <span className="lc-divider" />
      <Avatar name={student} size="sm" />
      <strong>{student}</strong>
      <span className="lc-sessionbar__copyright">{copyrightText()}</span>
    </footer>
  );
}
