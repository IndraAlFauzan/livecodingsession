import { useState } from "react";
import AuthAside from "../layout/AuthAside.jsx";
import AuthLayout from "../layout/AuthLayout.jsx";
import { Button, TextField } from "../ui/index.js";
import { adminApi } from "../../lib/api.js";

export default function AdminLogin({ onLogin }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminApi(value.trim()).check();
      onLogin(value.trim());
    } catch (err) {
      setError(err.status === 401 ? "Token tidak cocok dengan TEACHER_TOKEN di server." : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      aside={
        <AuthAside
          title="Mulai sesi dari VS Code, kelas ikut melihat."
          text="Kelola mata kuliah, kode akses, dan pertemuan di sini. Sesi live dijalankan dari extension."
        />
      }>
      <form className="lc-join lc-joinbox" onSubmit={handleSubmit}>
        <div>
          <h1 className="lc-join__title">Masuk sebagai dosen</h1>
          <p className="lc-join__text">Gunakan teacher token yang sama dengan setting VS Code kamu.</p>
        </div>
        <TextField
          label="Teacher token"
          type="password"
          mono
          icon="key"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="current-password"
          autoFocus
          error={error}
        />
        <Button size="lg" block type="submit" disabled={submitting || !value.trim()}>
          {submitting ? "Memeriksa token..." : "Masuk ke admin"}
        </Button>
      </form>
    </AuthLayout>
  );
}
