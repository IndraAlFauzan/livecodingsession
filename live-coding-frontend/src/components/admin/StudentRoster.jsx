import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Dialog, EmptyState, Modal } from "../ui/index.js";
import { formatDateTime } from "../../lib/api.js";

// Daftar anggota kelas, dan satu-satunya jalan dosen menolong mahasiswa yang
// lupa kata sandi. Sandi lama tidak bisa dibaca siapa pun, jadi yang tersedia
// hanya menggantinya.
export default function StudentRoster({ api, courseId, onError }) {
  const [students, setStudents] = useState(null);
  const [akanReset, setAkanReset] = useState(null);
  const [hasilReset, setHasilReset] = useState(null);
  const [sedangReset, setSedangReset] = useState(false);
  const tutupRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setStudents((await api.courseStudents(courseId)).students);
    } catch (err) {
      onError(err);
    }
  }, [api, courseId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function reset() {
    setSedangReset(true);
    try {
      setHasilReset(await api.resetStudentPassword(akanReset.nim));
      setAkanReset(null);
    } catch (err) {
      onError(err);
      setAkanReset(null);
    } finally {
      setSedangReset(false);
    }
  }

  return (
    <Card title="Mahasiswa" icon="users" actions={<span className="lc-count">{students?.length ?? "-"}</span>}>
      {students === null && <p className="lc-muted">Memuat daftar mahasiswa...</p>}

      {students?.length === 0 && (
        <EmptyState
          icon="users"
          title="Belum ada mahasiswa yang bergabung."
          text="Bagikan kode akses di atas supaya mahasiswa bisa bergabung."
        />
      )}

      {students?.length > 0 && (
        <table className="lc-table">
          <thead>
              <tr>
                <th>NIM</th>
                <th>Nama</th>
                <th>Bergabung</th>
                <th>Terakhir masuk</th>
                <th aria-label="Aksi" />
              </tr>
          </thead>
          <tbody>
              {students.map((s) => (
                <tr key={s.nim}>
                  <td className="lc-mono">{s.nim}</td>
                  <td>{s.name}</td>
                  <td className="lc-muted">{formatDateTime(s.joinedAt)}</td>
                  <td className="lc-muted">{s.lastLogin ? formatDateTime(s.lastLogin) : "Belum pernah"}</td>
                  <td>
                    <Button variant="ghost" size="sm" icon="key" onClick={() => setAkanReset(s)}>
                      Reset sandi
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {akanReset && (
        <Dialog
          icon="key"
          title={`Reset kata sandi ${akanReset.name}?`}
          text="Kata sandi lamanya langsung tidak berlaku dan semua perangkatnya dikeluarkan. Sandi penggantinya ditampilkan sekali saja untuk kamu bacakan."
          confirmLabel={sedangReset ? "Memproses..." : "Ya, reset sandi"}
          onCancel={() => setAkanReset(null)}
          onConfirm={reset}
        />
      )}

      {hasilReset && (
        <Modal onClose={() => setHasilReset(null)} initialFocus={tutupRef} labelledBy="reset-title">
          <h2 className="lc-dialog__title" id="reset-title">
            Kata sandi baru untuk {hasilReset.student.name}
          </h2>
          <p className="lc-newpass">{hasilReset.password}</p>
          <p className="lc-dialog__text">
            Catat atau bacakan sekarang — sandi ini tidak bisa dilihat lagi setelah jendela ini ditutup. Minta
            mahasiswa menggantinya setelah berhasil masuk.
          </p>
          <div className="lc-dialog__actions">
            <Button ref={tutupRef} onClick={() => setHasilReset(null)}>
              Sudah saya catat
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
