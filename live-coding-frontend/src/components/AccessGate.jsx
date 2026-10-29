import { Link } from "react-router-dom";
import AccessForm from "./AccessForm.jsx";
import PageShell from "./PageShell.jsx";

export default function AccessGate({ slug, message, onSuccess }) {
  return (
    <PageShell width="narrow">
      <Link className="back-link" to="/">
        Kembali ke beranda
      </Link>
      <h1 className="page-title">Masukkan kode akses</h1>
      <p className="lead">Halaman ini milik sebuah mata kuliah. Kamu perlu kode aksesnya dari dosen untuk membukanya.</p>
      <section className="panel">
        <AccessForm expectedSlug={slug} message={message} onSuccess={onSuccess} />
      </section>
    </PageShell>
  );
}
