import { useRef, useState } from "react";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";
import { Button, Modal, TextField } from "../ui/index.js";

export default function PasswordDialog({ onClose }) {
  const { changePassword } = useStudentAuth();
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [error, setError] = useState(null);
  const [mengirim, setMengirim] = useState(false);
  const [selesai, setSelesai] = useState(null);
  const tutupRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!lama || !baru) {
      setError("Isi kata sandi lama dan yang baru.");
      return;
    }
    if (baru.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    // Dicegat di sini karena server tidak pernah melihat kolom ulangan.
    if (baru !== ulang) {
      setError("Ulangan kata sandi tidak sama.");
      return;
    }

    setMengirim(true);
    setError(null);
    try {
      const hasil = await changePassword(lama, baru);
      setSelesai(hasil.otherSessionsRevoked);
    } catch (err) {
      setError(err.message);
    } finally {
      setMengirim(false);
    }
  }

  if (selesai !== null) {
    return (
      <Modal onClose={onClose} initialFocus={tutupRef} labelledBy="sandi-selesai">
        <h2 className="lc-dialog__title" id="sandi-selesai">
          Kata sandi diganti
        </h2>
        <p className="lc-dialog__text">
          {selesai > 0
            ? `Mulai sekarang pakai kata sandi baru. ${selesai} perangkat lain yang masih masuk sudah dikeluarkan.`
            : "Mulai sekarang pakai kata sandi baru saat masuk."}
        </p>
        <div className="lc-dialog__actions">
          <Button ref={tutupRef} onClick={onClose}>
            Tutup
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} labelledBy="sandi-judul">
      <h2 className="lc-dialog__title" id="sandi-judul">
        Ganti kata sandi
      </h2>
      <form className="lc-sandiform" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Kata sandi sekarang"
          type="password"
          value={lama}
          onChange={(event) => setLama(event.target.value)}
          autoComplete="current-password"
          maxLength={200}
        />
        <TextField
          label="Kata sandi baru"
          type="password"
          value={baru}
          onChange={(event) => setBaru(event.target.value)}
          autoComplete="new-password"
          maxLength={200}
          hint="Minimal 8 karakter."
        />
        <TextField
          label="Ulangi kata sandi baru"
          type="password"
          value={ulang}
          onChange={(event) => setUlang(event.target.value)}
          autoComplete="new-password"
          maxLength={200}
          error={error}
        />
        <p className="lc-dialog__text">Perangkat lain yang masih masuk akan dikeluarkan.</p>
        <div className="lc-dialog__actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={mengirim}>
            {mengirim ? "Menyimpan..." : "Ganti kata sandi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
