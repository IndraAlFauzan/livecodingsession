import Brand from "./Brand.jsx";
import InstitutionMarks from "./InstitutionMarks.jsx";
import Copyright from "../../utils/copyright.jsx";

// Layar pintu masuk: bar merek di atas, lalu form di kiri dan pratinjau sesi di kanan.
export default function AuthLayout({ aside, note, children }) {
  return (
    <div className="lc-auth">
      <header className="lc-auth__top">
        <Brand size="sm" to={null} />
        <InstitutionMarks className="lc-marks--bare" />
      </header>

      <div className="lc-auth__body">
        <div className="lc-auth__form">
          <div className="lc-auth__stack">
            {children}
            {note && <p className="lc-sub lc-auth__note">{note}</p>}
          </div>
          <Copyright />
        </div>
        {aside}
      </div>
    </div>
  );
}
