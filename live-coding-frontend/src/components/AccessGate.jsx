import { Link } from "react-router-dom";
import AccessForm from "./AccessForm.jsx";

export default function AccessGate({ slug, message, onSuccess }) {
  return (
    <div className="page page-narrow">
      <header className="page-header">
        <Link className="back-link" to="/">
          ← Beranda
        </Link>
        <h1>Masukkan kode akses</h1>
        <p className="muted">Halaman ini membutuhkan kode akses mata kuliah dari dosen.</p>
      </header>
      <section className="card">
        <AccessForm expectedSlug={slug} message={message} onSuccess={onSuccess} />
      </section>
    </div>
  );
}
