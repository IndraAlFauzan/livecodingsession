import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Dialog, EmptyState, Modal, Switch, TextField } from "../ui/index.js";
import { formatDateTime } from "../../lib/api.js";

// Kelola akun dosen. Hanya admin kampus yang melihat kartu ini.
//
// Sandi tidak pernah diketik admin: server yang membuatnya, ditampilkan sekali
// untuk dibacakan, lalu tidak bisa dilihat lagi. Pola yang sama dengan reset
// sandi mahasiswa, supaya tidak ada sandi yang beredar lewat chat.
export default function TeacherRoster({ api, onError }) {
  const [teachers, setTeachers] = useState(null);
  const [menambah, setMenambah] = useState(false);
  const [username, setUsername] = useState("");
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [akanReset, setAkanReset] = useState(null);
  const [sandiBaru, setSandiBaru] = useState(null);
  const tutupRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setTeachers((await api.teachers()).teachers);
    } catch (err) {
      onError(err);
    }
  }, [api, onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function tambah(event) {
    event.preventDefault();
    setSibuk(true);
    try {
      const hasil = await api.createTeacher(username.trim(), kode.trim(), nama.trim());
      setSandiBaru({ ...hasil, judul: `Akun dosen ${hasil.teacher.name} dibuat` });
      setUsername("");
      setKode("");
      setNama("");
      setMenambah(false);
      await load();
    } catch (err) {
      onError(err);
    } finally {
      setSibuk(false);
    }
  }

  async function reset() {
    setSibuk(true);
    try {
      const hasil = await api.resetTeacherPassword(akanReset.id);
      setSandiBaru({ ...hasil, judul: `Kata sandi baru untuk ${hasil.teacher.name}` });
      setAkanReset(null);
      await load();
    } catch (err) {
      onError(err);
      setAkanReset(null);
    } finally {
      setSibuk(false);
    }
  }

  async function ubahAktif(dosen, active) {
    try {
      await api.setTeacherActive(dosen.id, active);
      await load();
    } catch (err) {
      onError(err);
    }
  }

  return (
    <Card
      title="Dosen"
      icon="users"
      actions={
        <Button variant="secondary" size="sm" icon="plus" onClick={() => setMenambah((n) => !n)}>
          Tambah dosen
        </Button>
      }>
      {menambah && (
        <form className="lc-fields" onSubmit={tambah}>
          <TextField
            label="Username"
            className="lc-field--lower"
            mono
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            placeholder="och"
            maxLength={30}
            spellCheck={false}
            hint="3-30 karakter: huruf, angka, titik, garis bawah, atau strip."
            autoFocus
          />
          <TextField
            label="Kode dosen"
            mono
            value={kode}
            onChange={(event) => setKode(event.target.value.toUpperCase())}
            placeholder="OCH"
            maxLength={10}
            hint="2-10 huruf atau angka. Mahasiswa melihat kode ini di samping nama mata kuliah."
          />
          <TextField
            label="Nama lengkap"
            value={nama}
            onChange={(event) => setNama(event.target.value)}
            maxLength={100}
          />
          <div className="lc-card__foot">
            <Button type="submit" disabled={sibuk || !username.trim() || !kode.trim() || !nama.trim()}>
              {sibuk ? "Membuat..." : "Buat akun"}
            </Button>
          </div>
        </form>
      )}

      {teachers === null && <p className="lc-muted">Memuat daftar dosen...</p>}

      {teachers?.length === 0 && !menambah && (
        <EmptyState
          icon="users"
          title="Belum ada akun dosen."
          text="Selama belum ada, semua mata kuliah tetap milik admin kampus dan hanya bisa dikelola dari sini."
        />
      )}

      {teachers?.length > 0 && (
        <table className="lc-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Username</th>
              <th>Mata kuliah</th>
              <th>Terakhir masuk</th>
              <th>Aktif</th>
              <th aria-label="Aksi" />
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id}>
                <td className="lc-mono">{t.code}</td>
                <td>{t.name}</td>
                <td className="lc-mono lc-muted">{t.username}</td>
                <td className="lc-muted">{t.courseCount}</td>
                <td className="lc-muted">{t.lastLogin ? formatDateTime(t.lastLogin) : "Belum pernah"}</td>
                <td>
                  <Switch
                    label={t.active ? "Aktif" : "Nonaktif"}
                    checked={t.active}
                    onChange={() => ubahAktif(t, !t.active)}
                  />
                </td>
                <td>
                  <Button variant="ghost" size="sm" icon="key" onClick={() => setAkanReset(t)}>
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
          confirmLabel={sibuk ? "Memproses..." : "Ya, reset sandi"}
          onCancel={() => setAkanReset(null)}
          onConfirm={reset}
        />
      )}

      {sandiBaru && (
        <Modal onClose={() => setSandiBaru(null)} initialFocus={tutupRef} labelledBy="sandi-dosen">
          <h2 className="lc-dialog__title" id="sandi-dosen">
            {sandiBaru.judul}
          </h2>
          <p className="lc-newpass">{sandiBaru.password}</p>
          <p className="lc-dialog__text">
            Catat atau bacakan sekarang — sandi ini tidak bisa dilihat lagi setelah jendela ini ditutup. Minta
            dosennya menggantinya setelah berhasil masuk.
          </p>
          <div className="lc-dialog__actions">
            <Button ref={tutupRef} onClick={() => setSandiBaru(null)}>
              Sudah saya catat
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
