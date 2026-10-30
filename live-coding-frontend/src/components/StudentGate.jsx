import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import AuthAside from "./layout/AuthAside.jsx";
import AuthLayout from "./layout/AuthLayout.jsx";
import AuthCard from "./student/AuthCard.jsx";

// Pembungkus semua halaman mahasiswa: selama belum masuk, yang tampil adalah
// layar akun, bukan isi halamannya.
export default function StudentGate({ children }) {
  const { status } = useStudentAuth();

  if (status === "memuat") {
    return (
      <div className="lc-page">
        <div className="lc-page__body">
          <p className="lc-muted">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  if (status === "keluar") {
    return (
      <AuthLayout
        note="Kode di halaman kelas hanya bisa dibaca. Salin, klik kanan, dan cetak dimatikan selama kamu melihatnya."
        aside={
          <AuthAside
            title="Lihat kode dosen langsung, baris demi baris."
            text="Saat dosen menyorot sebuah baris di VS Code, sorotan itu muncul di layarmu detik itu juga."
          />
        }>
        <AuthCard heading="h1" />
      </AuthLayout>
    );
  }

  return children;
}
