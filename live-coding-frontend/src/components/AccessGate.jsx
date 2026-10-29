import AccessForm from "./AccessForm.jsx";
import Breadcrumb from "./Breadcrumb.jsx";
import PageShell from "./PageShell.jsx";

export default function AccessGate({ slug, message, onSuccess }) {
  return (
    <PageShell width="narrow">
      <Breadcrumb items={[{ label: "Beranda", to: "/" }, { label: "Kode akses" }]} />
      <h1 className="page-title">Masukkan kode akses</h1>
      <p className="lead">Halaman ini milik sebuah mata kuliah. Masukkan kode aksesnya dari dosen untuk membukanya.</p>
      <section className="panel" aria-label="Form kode akses">
        <AccessForm expectedSlug={slug} message={message} onSuccess={onSuccess} />
      </section>
    </PageShell>
  );
}
