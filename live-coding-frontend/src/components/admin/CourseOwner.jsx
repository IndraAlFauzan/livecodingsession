import { useEffect, useState } from "react";
import { Button, Card } from "../ui/index.js";

// Menyerahkan mata kuliah ke dosen, atau menariknya kembali ke admin kampus.
// Hanya admin yang melihat kartu ini -- server juga menolaknya dengan 403.
export default function CourseOwner({ api, course, onError, onChanged }) {
  const [teachers, setTeachers] = useState(null);
  const [pilihan, setPilihan] = useState(String(course.teacherId ?? ""));
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    let batal = false;
    api
      .teachers()
      .then((data) => !batal && setTeachers(data.teachers))
      .catch(onError);
    return () => {
      batal = true;
    };
  }, [api, onError]);

  useEffect(() => {
    setPilihan(String(course.teacherId ?? ""));
  }, [course.teacherId]);

  const berubah = pilihan !== String(course.teacherId ?? "");

  async function simpan() {
    setSibuk(true);
    try {
      await api.setCourseOwner(course.id, pilihan === "" ? null : Number(pilihan));
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <Card title="Pengampu" icon="users">
      <label className="lc-field">
        <span className="lc-field__label" htmlFor="pemilik">
          Dosen pengampu
        </span>
        <select
          id="pemilik"
          className="lc-select"
          value={pilihan}
          onChange={(event) => setPilihan(event.target.value)}
          disabled={teachers === null}>
          <option value="">Admin kampus (belum diserahkan)</option>
          {(teachers || []).map((t) => (
            <option key={t.id} value={String(t.id)} disabled={!t.active}>
              {t.code} — {t.name}
              {t.active ? "" : " (nonaktif)"}
            </option>
          ))}
        </select>
      </label>

      <p className="lc-muted">
        Setelah diserahkan, hanya dosen itu dan admin kampus yang bisa membukanya. Mahasiswa melihat kode
        dosennya di samping nama mata kuliah.
      </p>

      {berubah && (
        <div className="lc-card__foot">
          <Button size="sm" onClick={simpan} disabled={sibuk}>
            {sibuk ? "Menyimpan..." : "Simpan pengampu"}
          </Button>
        </div>
      )}
    </Card>
  );
}
