import { useState } from "react";
import AppHeader from "../components/layout/AppHeader.jsx";
import PasswordDialog from "../components/student/PasswordDialog.jsx";
import { Button, Card, Dialog } from "../components/ui/index.js";
import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import { formatDateTime } from "../lib/api.js";

function Baris({ label, children }) {
  return (
    <div className="lc-rowinfo">
      <span className="lc-rowinfo__label">{label}</span>
      <span className="lc-rowinfo__value">{children}</span>
    </div>
  );
}

export default function AccountPage() {
  const { student, courses, logout } = useStudentAuth();
  const [gantiSandi, setGantiSandi] = useState(false);
  const [akanKeluar, setAkanKeluar] = useState(false);

  return (
    <>
      <AppHeader title="Akun" crumb="Live Coding" user={student?.name} />

      <div className="lc-page__body">
        <Card title="Identitas" icon="users">
          <div className="lc-rowinfo__group">
            <Baris label="Nama">{student?.name || "—"}</Baris>
            <Baris label="NIM">
              <span className="lc-mono">{student?.nim || "—"}</span>
            </Baris>
            <Baris label="Mata kuliah diikuti">{courses.length}</Baris>
          </div>
          <p className="lc-muted">
            Nama dan NIM dipakai dosen untuk mencocokkanmu ke daftar kelas, jadi keduanya tidak bisa
            diubah sendiri. Kalau ada yang salah, hubungi dosen pengampu.
          </p>
        </Card>

        <Card title="Keamanan" icon="key">
          <p className="lc-muted">
            Mengganti kata sandi akan mengeluarkan perangkat lain yang masih masuk dengan akun ini.
          </p>
          <div className="lc-card__foot">
            <Button variant="secondary" icon="key" onClick={() => setGantiSandi(true)}>
              Ganti kata sandi
            </Button>
          </div>
        </Card>

        <Card title="Keluar" icon="logout">
          <p className="lc-muted">
            Kamu keluar dari perangkat ini saja. Riwayat mata kuliah tetap tersimpan di akunmu.
          </p>
          <div className="lc-card__foot">
            <Button variant="secondary" icon="logout" onClick={() => setAkanKeluar(true)}>
              Keluar dari akun
            </Button>
          </div>
        </Card>

        {courses.length > 0 && (
          <Card title="Riwayat bergabung" icon="clock">
            <div className="lc-rowinfo__group">
              {courses.map((course) => (
                <Baris key={course.slug} label={course.name}>
                  {formatDateTime(course.joinedAt)}
                </Baris>
              ))}
            </div>
          </Card>
        )}
      </div>

      {gantiSandi && <PasswordDialog onClose={() => setGantiSandi(false)} />}

      {akanKeluar && (
        <Dialog
          icon="logout"
          title="Keluar dari akun?"
          text="Kamu perlu memasukkan NIM dan kata sandi lagi untuk masuk di perangkat ini."
          confirmLabel="Ya, keluar"
          onCancel={() => setAkanKeluar(false)}
          onConfirm={logout}
        />
      )}
    </>
  );
}
