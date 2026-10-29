import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AccessForm from "../components/AccessForm.jsx";
import PageShell from "../components/PageShell.jsx";
import { storage } from "../lib/storage.js";

export default function HomePage() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => storage.getCourses());
  const savedEntries = Object.entries(saved);

  function forget(slug) {
    storage.forgetCourse(slug);
    setSaved(storage.getCourses());
  }

  return (
    <PageShell>
      <div className="home-grid">
        <section className="home-intro">
          <h1 className="display">Ikuti kode yang ditulis dosen, baris demi baris.</h1>
          <p className="lead">
            Saat kelas berlangsung, kode dari editor dosen tampil di sini secara langsung. Setelah kelas selesai, kodenya
            tetap tersimpan per pertemuan untuk dibaca ulang.
          </p>

          <dl className="notes">
            <div>
              <dt>Kode akses</dt>
              <dd>Setiap mata kuliah punya kode sendiri. Mintalah ke dosen pengampu.</dd>
            </div>
            <div>
              <dt>Hanya untuk dibaca</dt>
              <dd>Salin dan klik kanan dimatikan di halaman kode. Ketik ulang di editormu sendiri, itu bagian dari latihannya.</dd>
            </div>
            <div>
              <dt>Watermark nama</dt>
              <dd>Nama yang kamu isi tampil samar di atas kode selama kamu melihatnya.</dd>
            </div>
          </dl>
        </section>

        <div className="home-side">
          <section className="panel panel-entry" aria-labelledby="entry-title">
            <h2 className="panel-title" id="entry-title">
              Masuk ke kelas
            </h2>
            <AccessForm onSuccess={(course) => navigate(`/mk/${course.slug}`)} />
          </section>

          {savedEntries.length > 0 && (
            <section className="saved" aria-labelledby="saved-title">
              <h2 className="section-title" id="saved-title">
                Mata kuliah yang pernah kamu buka
              </h2>
              <ul className="saved-list">
                {savedEntries.map(([slug, course]) => (
                  <li key={slug}>
                    <Link className="saved-name" to={`/mk/${slug}`}>
                      {course.name}
                    </Link>
                    <button className="btn btn-quiet btn-small" onClick={() => forget(slug)}>
                      Lupakan
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}
