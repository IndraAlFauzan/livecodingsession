import { useCallback, useMemo, useState } from "react";
import AdminDashboard from "../components/admin/AdminDashboard.jsx";
import AdminLogin from "../components/admin/AdminLogin.jsx";
import { adminApi } from "../lib/api.js";
import { storage } from "../lib/storage.js";

export default function AdminPage() {
  const [token, setToken] = useState(() => storage.getAdminToken());
  const api = useMemo(() => (token ? adminApi(token) : null), [token]);

  const logout = useCallback(() => {
    storage.setAdminToken(null);
    setToken(null);
  }, []);

  if (!api) {
    return (
      <AdminLogin
        onLogin={(value) => {
          storage.setAdminToken(value);
          setToken(value);
        }}
      />
    );
  }
  return <AdminDashboard api={api} onLogout={logout} />;
}
