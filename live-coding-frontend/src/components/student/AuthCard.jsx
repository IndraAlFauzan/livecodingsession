import { useState } from "react";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";
import Button from "../ui/Button.jsx";
import PasswordField from "../ui/PasswordField.jsx";
import Segmented from "../ui/Segmented.jsx";
import TextField from "../ui/TextField.jsx";

const MASUK = 0;
const DAFTAR = 1;

export default function AuthCard({ heading = "h2", message }) {
  const { login, register } = useStudentAuth();
  const [tab, setTab] = useState(MASUK);
  const [nim, setNim] = useState("");
  const [nama, setNama] = useState("");
  const [sandi, setSandi] = useState("");
  const [error, setError] = useState(message || null);
  const [mengirim, setMengirim] = useState(false);
  const Heading = heading;

  const mendaftar = tab === DAFTAR;

  function gantiTab(index) {
    setTab(index);
    setError(null);
    setSandi("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nimBersih = nim.trim();
    const namaBersih = nama.trim();
    if (!nimBersih || !sandi || (mendaftar && !namaBersih)) {
      setError(mendaftar ? "Isi NIM, nama, dan kata sandi dulu." : "Isi NIM dan kata sandi dulu.");
      return;
    }
    if (mendaftar && sandi.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setMengirim(true);
    setError(null);
    try {
      if (mendaftar) await register(nimBersih, namaBersih, sandi);
      else await login(nimBersih, sandi);
    } catch (err) {
      setError(err.message);
    } finally {
      setMengirim(false);
    }
  }

  return (
    <form className="lc-join lc-joinbox" onSubmit={handleSubmit} noValidate>
      <div>
        <Heading className="lc-join__title">{mendaftar ? "Buat akun" : "Masuk"}</Heading>
        <p className="lc-join__text">
          {mendaftar
            ? "Akunmu menyimpan riwayat mata kuliah, jadi tetap ada saat ganti perangkat."
            : "Masuk dengan NIM dan kata sandimu."}
        </p>
      </div>

      <Segmented
        items={[{ label: "Masuk" }, { label: "Daftar" }]}
        value={tab}
        onChange={gantiTab}
        label="Masuk atau daftar"
      />

      {/* Kolom isian dirapatkan jadi satu kelompok; jarak lebar disimpan untuk
          memisahkan judul, pemilih mode, isian, dan tombol. */}
      <div className="lc-fields">
        <TextField
          label="NIM"
          mono
          value={nim}
          onChange={(event) => setNim(event.target.value.toUpperCase())}
          placeholder="1301223045"
          maxLength={20}
          autoComplete="username"
          spellCheck={false}
          autoFocus
        />

        {mendaftar && (
          <TextField
            label="Nama lengkap"
            value={nama}
            onChange={(event) => setNama(event.target.value)}
            placeholder="Nama sesuai data kampus"
            maxLength={100}
            autoComplete="name"
          />
        )}

        <PasswordField
          // Dipasang ulang saat pindah tab, supaya status "sandi terlihat"
          // tidak terbawa ke kolom yang baru saja dikosongkan.
          key={mendaftar ? "daftar" : "masuk"}
          label="Kata sandi"
          value={sandi}
          onChange={(event) => setSandi(event.target.value)}
          maxLength={200}
          autoComplete={mendaftar ? "new-password" : "current-password"}
          error={error}
          hint={mendaftar ? "Minimal 8 karakter." : undefined}
        />
      </div>

      <Button size="lg" block type="submit" disabled={mengirim}>
        {mengirim ? "Memproses..." : mendaftar ? "Daftar" : "Masuk"}
      </Button>
    </form>
  );
}
