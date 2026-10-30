import AuthAside from "./layout/AuthAside.jsx";
import AuthLayout from "./layout/AuthLayout.jsx";
import JoinCard from "./student/JoinCard.jsx";

export default function AccessGate({ slug, message, onSuccess }) {
  return (
    <AuthLayout
      note="Halaman ini milik sebuah mata kuliah. Masukkan kode aksesnya dari dosen untuk membukanya."
      aside={
        <AuthAside
          title="Satu kode akses untuk satu mata kuliah."
          text="Kode diberikan dosen pengampu. Kalau kodenya sudah diganti, minta yang terbaru."
        />
      }>
      <JoinCard expectedSlug={slug} message={message} heading="h1" onSuccess={onSuccess} />
    </AuthLayout>
  );
}
