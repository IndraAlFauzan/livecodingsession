import { useState } from "react";
import { Link } from "react-router-dom";
import AuthAside from "../layout/AuthAside.jsx";
import AuthLayout from "../layout/AuthLayout.jsx";
import { Button, PasswordField, TextField } from "../ui/index.js";
import { adminApi, teacherAuth } from "../../lib/api.js";

// Dua pintu terpisah, bukan satu dengan sakelar: dosen tidak perlu tahu pintu
// admin kampus ada, dan Anda tidak perlu melewati pilihan tiap kali masuk.
export default function AdminLogin({ mode = "dosen", onLogin }) {
  const sebagaiAdmin = mode === "admin";
  const [username, setUsername] = useState("");
  const [sandi, setSandi] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState(null);
  const [mengirim, setMengirim] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMengirim(true);
    setError(null);
    try {
      if (sebagaiAdmin) {
        // Kunci admin kampus dari env: tidak ada sesi, tokennya dipakai langsung.
        const nilai = token.trim();
        await adminApi(nilai).check();
        onLogin(nilai);
      } else {
        const { token: tandaSesi } = await teacherAuth.login(username.trim(), sandi);
        onLogin(tandaSesi);
      }
    } catch (err) {
      setError(
        sebagaiAdmin && err.status === 401
          ? "Token tidak cocok dengan TEACHER_TOKEN di server."
          : err.message,
      );
    } finally {
      setMengirim(false);
    }
  }

  const kosong = sebagaiAdmin ? !token.trim() : !username.trim() || !sandi;

  return (
    <AuthLayout
      aside={
        <AuthAside
          title="Mulai sesi dari VS Code, kelas ikut melihat."
          text="Kelola mata kuliah, kode akses, dan pertemuan di sini. Sesi live dijalankan dari extension."
        />
      }>
      <form className="lc-join lc-joinbox" onSubmit={handleSubmit} noValidate>
        <div>
          <h1 className="lc-join__title">{sebagaiAdmin ? "Masuk sebagai admin kampus" : "Masuk sebagai dosen"}</h1>
          <p className="lc-join__text">
            {sebagaiAdmin
              ? "Kunci dari env server. Melihat semua mata kuliah dan mengelola akun dosen."
              : "Pakai username dan kata sandi dari admin kampus."}
          </p>
        </div>

        <div className="lc-fields">
          {sebagaiAdmin ? (
            <PasswordField
              label="Teacher token"
              mono
              icon="key"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="current-password"
              error={error}
            />
          ) : (
            <>
              <TextField
                label="Username"
                className="lc-field--lower"
                mono
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="och"
                maxLength={30}
                autoComplete="username"
                spellCheck={false}
                autoFocus
              />
              <PasswordField
                label="Kata sandi"
                value={sandi}
                onChange={(event) => setSandi(event.target.value)}
                autoComplete="current-password"
                error={error}
                hint="Lupa sandi? Hubungi admin kampus."
              />
            </>
          )}
        </div>

        <Button size="lg" block type="submit" disabled={mengirim || kosong}>
          {mengirim ? "Memeriksa..." : "Masuk"}
        </Button>

        {sebagaiAdmin && (
          <p className="lc-join__text">
            <Link to="/dosen">Masuk sebagai dosen</Link>
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
