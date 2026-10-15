import { useState } from "react";
import { studentApi } from "../lib/api.js";
import { storage } from "../lib/storage.js";

export default function AccessForm({ expectedSlug, message, onSuccess }) {
  const [name, setName] = useState(() => storage.getStudentName());
  const [code, setCode] = useState("");
  const [error, setError] = useState(message || null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) {
      setError("Nama dan kode akses wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { course } = await studentApi.access(trimmedCode);
      if (expectedSlug && course.slug !== expectedSlug) {
        setError(`Kode ini untuk mata kuliah lain (${course.name}).`);
        return;
      }
      storage.setStudentName(trimmedName);
      storage.saveCourse(course.slug, course.name, trimmedCode.toUpperCase());
      onSuccess(course);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nama lengkap</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Contoh: Budi Santoso"
          maxLength={60}
          autoComplete="name"
        />
      </label>

      <label className="field">
        <span>Kode akses mata kuliah</span>
        <input
          className="mono"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Contoh: PM-7K3XQ2"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Memeriksa..." : "Masuk"}
      </button>
      <p className="form-hint">Nama kamu ditampilkan sebagai watermark saat melihat kode.</p>
    </form>
  );
}
