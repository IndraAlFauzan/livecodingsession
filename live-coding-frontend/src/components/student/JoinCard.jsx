import { useState } from "react";
import { studentApi } from "../../lib/api.js";
import { storage } from "../../lib/storage.js";
import Button from "../ui/Button.jsx";
import TextField from "../ui/TextField.jsx";

export default function JoinCard({ expectedSlug, message, heading = "h2", onSuccess }) {
  const Heading = heading;
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
    <form className="lc-join lc-joinbox" onSubmit={handleSubmit} noValidate>
      <div>
        <Heading className="lc-join__title">Masuk ke kelas</Heading>
        <p className="lc-join__text">Isi namamu dan kode akses dari dosen. Tidak perlu membuat akun.</p>
      </div>

      <TextField
        label="Nama lengkap"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nama sesuai daftar hadir"
        maxLength={60}
        autoComplete="name"
      />

      <TextField
        label="Kode akses mata kuliah"
        mono
        icon="key"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="PM-7K3XQ2"
        maxLength={20}
        autoComplete="off"
        spellCheck={false}
        error={error}
        hint="Huruf besar atau kecil sama saja."
      />

      <Button size="lg" block iconRight="chevron-right" type="submit" disabled={submitting}>
        {submitting ? "Memeriksa kode..." : "Masuk kelas"}
      </Button>
    </form>
  );
}
