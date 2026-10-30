import { useState } from "react";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";
import Button from "../ui/Button.jsx";
import TextField from "../ui/TextField.jsx";

// Kode akses hanya dipakai sekali, untuk bergabung. Setelah itu yang berlaku
// adalah keanggotaan kelas, jadi dosen boleh mengganti kodenya kapan saja.
export default function JoinCard({ expectedSlug, message, heading = "h2", onSuccess }) {
  const Heading = heading;
  const { joinCourse } = useStudentAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState(message || null);
  const [mengirim, setMengirim] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const kode = code.trim();
    if (!kode) {
      setError("Isi kode akses dulu.");
      return;
    }

    setMengirim(true);
    setError(null);
    try {
      const course = await joinCourse(kode);
      if (expectedSlug && course.slug !== expectedSlug) {
        setError(`Kode ini untuk mata kuliah lain (${course.name}).`);
        return;
      }
      setCode("");
      onSuccess?.(course);
    } catch (err) {
      setError(err.message);
    } finally {
      setMengirim(false);
    }
  }

  return (
    <form className="lc-join lc-joinbox" onSubmit={handleSubmit} noValidate>
      <div>
        <Heading className="lc-join__title">Gabung mata kuliah</Heading>
        <p className="lc-join__text">Masukkan kode akses dari dosen. Cukup sekali per mata kuliah.</p>
      </div>

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

      <Button size="lg" block iconRight="chevron-right" type="submit" disabled={mengirim}>
        {mengirim ? "Memeriksa kode..." : "Gabung"}
      </Button>
    </form>
  );
}
