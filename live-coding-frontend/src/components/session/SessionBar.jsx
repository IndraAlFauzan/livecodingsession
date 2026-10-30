import { copyrightText } from "../../utils/copyright.jsx";

const CONNECTION = {
  connecting: ["wait", "Menghubungkan"],
  connected: ["on", "Terhubung"],
  disconnected: ["wait", "Terputus, mencoba lagi"],
};

// Status bar ala VS Code: menempel di bawah editor, berwarna violet hanya selama sesi live.
export default function SessionBar({ connectionStatus, teacherFile, follow, onFollowChange, student, isLive, language }) {
  const [tone, label] = CONNECTION[connectionStatus] || CONNECTION.connecting;

  return (
    <footer className={isLive ? "lc-statusbar is-live" : "lc-statusbar"}>
      <span className={`lc-statusbar__item lc-conn lc-conn--${tone}`}>
        <i />
        {label}
      </span>

      {isLive && (
        <>
          <span className="lc-statusbar__item lc-statusbar__teacher" title={teacherFile || undefined}>
            Dosen membuka <span className="lc-mono">{teacherFile || "-"}</span>
          </span>
          <button
            type="button"
            className="lc-statusbar__item lc-statusbar__button"
            aria-pressed={follow}
            onClick={() => onFollowChange(!follow)}>
            Follow Dosen: {follow ? "aktif" : "nonaktif"}
          </button>
        </>
      )}

      <span className="lc-statusbar__spacer" />
      {language && <span className="lc-statusbar__item">{language}</span>}
      <span className="lc-statusbar__item">{student}</span>
      <span className="lc-statusbar__item lc-statusbar__copyright">{copyrightText()}</span>
    </footer>
  );
}
