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
      setError("Isi nama lengkap dan kode akses dulu.");
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
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Nama lengkap</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nama sesuai daftar hadir"
          maxLength={60}
          autoComplete="name"
        />
      </label>

      <label className="field">
        <span className="field-label">Kode akses mata kuliah</span>
        <input
          className="input-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Kode dari dosen"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="code-hint"
        />
        <span className="field-hint" id="code-hint">
          Contoh bentuknya: PM-7K3XQ2. Huruf besar atau kecil sama saja.
        </span>
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
        {submitting ? "Memeriksa kode..." : "Masuk kelas"}
      </button>
    </form>
  );
}
