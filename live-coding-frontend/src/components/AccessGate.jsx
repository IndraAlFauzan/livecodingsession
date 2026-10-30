import JoinCard from "./student/JoinCard.jsx";
import Copyright from "../utils/copyright.jsx";

export default function AccessGate({ slug, message, onSuccess }) {
  return (
    <div className="lc-page lc-page--center">
      <JoinCard expectedSlug={slug} message={message} heading="h1" onSuccess={onSuccess} />
      <p className="lc-sub lc-joinbox">
        Halaman ini milik sebuah mata kuliah. Masukkan kode aksesnya dari dosen untuk membukanya.
      </p>
      <Copyright />
    </div>
  );
}
