import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDashboard from "../components/admin/AdminDashboard.jsx";
import AdminLogin from "../components/admin/AdminLogin.jsx";
import { adminApi } from "../lib/api.js";
import { storage } from "../lib/storage.js";

export default function AdminPage({ mode = "dosen" }) {
  const [token, setToken] = useState(() => storage.getAdminToken());
  const [identitas, setIdentitas] = useState(null);
  const api = useMemo(() => (token ? adminApi(token) : null), [token]);

  const lupakan = useCallback(() => {
    storage.setAdminToken(null);
    setToken(null);
    setIdentitas(null);
  }, []);

  // Identitas menentukan apa yang boleh tampil: kartu kelola dosen hanya untuk
  // admin kampus. Tanda sesi dosen bisa mati sewaktu-waktu (dinonaktifkan admin,
  // atau sandinya direset), jadi 401 di sini berarti harus masuk lagi.
  useEffect(() => {
    if (!api) return;
    let batal = false;
    api
      .check()
      .then((data) => !batal && setIdentitas(data))
      .catch((err) => {
        if (err.status === 401) lupakan();
      });
    return () => {
      batal = true;
    };
  }, [api, lupakan]);

  const logout = useCallback(async () => {
    // Dosen punya tanda sesi di server; admin kampus memakai token env yang
    // tidak bisa dicabut. Kegagalan jaringan tidak boleh menahan di layar.
    if (identitas && !identitas.admin) {
      try {
        await api.logout();
      } catch {
        // diabaikan
      }
    }
    lupakan();
  }, [api, identitas, lupakan]);

  if (!api) {
    return (
      <AdminLogin
        mode={mode}
        onLogin={(value) => {
          storage.setAdminToken(value);
          setToken(value);
        }}
      />
    );
  }

  return <AdminDashboard api={api} identitas={identitas} onLogout={logout} />;
}
