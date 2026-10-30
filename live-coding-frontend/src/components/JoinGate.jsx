import AuthAside from "./layout/AuthAside.jsx";
import AuthLayout from "./layout/AuthLayout.jsx";
import JoinCard from "./student/JoinCard.jsx";

// Sudah masuk, tapi belum jadi anggota mata kuliah yang dibuka.
export default function JoinGate({ slug, message, onSuccess }) {
  return (
    <AuthLayout
      note="Halaman ini milik sebuah mata kuliah. Masukkan kode aksesnya dari dosen untuk bergabung."
      aside={
        <AuthAside
          title="Satu kode akses untuk satu mata kuliah."
          text="Kode diberikan dosen pengampu. Setelah bergabung sekali, kamu tidak perlu memasukkannya lagi."
        />
      }>
      <JoinCard expectedSlug={slug} message={message} heading="h1" onSuccess={onSuccess} />
    </AuthLayout>
  );
}
