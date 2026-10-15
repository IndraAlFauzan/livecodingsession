import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AccessForm from "../components/AccessForm.jsx";
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
    <div className="page page-narrow">
      <header className="page-header">
        <h1>Live Coding Classroom</h1>
        <p className="muted">Masukkan kode akses yang dibagikan dosen untuk membuka mata kuliah.</p>
      </header>

      <section className="card">
        <AccessForm onSuccess={(course) => navigate(`/mk/${course.slug}`)} />
      </section>

      {savedEntries.length > 0 && (
        <section className="card">
          <h2 className="card-title">Mata kuliah kamu</h2>
          <ul className="saved-list">
            {savedEntries.map(([slug, course]) => (
              <li key={slug}>
                <Link to={`/mk/${slug}`}>{course.name}</Link>
                <button className="btn btn-ghost btn-small" onClick={() => forget(slug)}>
                  Hapus dari daftar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
