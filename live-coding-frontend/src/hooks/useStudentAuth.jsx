import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { studentApi } from "../lib/api.js";
import { storage } from "../lib/storage.js";

const StudentAuthContext = createContext(null);

const REFRESH_MS = 30000;

// Satu sumber kebenaran untuk "siapa yang sedang masuk" dan "kelas apa saja yang
// dia ikuti". Keduanya datang dari server, jadi berpindah perangkat tidak
// menghilangkan riwayat seperti pada versi yang menyimpannya di localStorage.
export function StudentAuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.getStudentToken());
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [recent, setRecent] = useState([]);
  // 'memuat' sampai tanda sesi tersimpan selesai diperiksa ke server; tanpa ini
  // layar masuk sempat berkedip muncul padahal mahasiswa sudah masuk.
  const [status, setStatus] = useState(token ? "memuat" : "keluar");

  const simpan = useCallback((tandaSesi, akun) => {
    storage.setStudentToken(tandaSesi);
    setToken(tandaSesi);
    setStudent(akun);
    setCourses([]);
    setRecent([]);
    setStatus("masuk");
  }, []);

  const lupakan = useCallback(() => {
    storage.setStudentToken(null);
    setToken(null);
    setStudent(null);
    setCourses([]);
    setRecent([]);
    setStatus("keluar");
  }, []);

  // /home dipakai, bukan /me: isinya sama plus status live dan riwayat, jadi
  // seluruh aplikasi cukup satu permintaan berkala -- halaman daftar tidak lagi
  // memanggil satu per mata kuliah.
  const muatUlang = useCallback(async () => {
    if (!token) return;
    try {
      const data = await studentApi.home(token);
      setStudent(data.student);
      setCourses(data.courses);
      setRecent(data.recent);
      setStatus("masuk");
    } catch (err) {
      // 401 berarti tanda sesi sudah mati (logout di perangkat lain, atau akun
      // dihapus dosen). Apa pun galat lain dibiarkan -- jangan paksa keluar
      // hanya karena jaringan sedang putus.
      if (err.status === 401) lupakan();
      else setStatus("masuk");
    }
  }, [token, lupakan]);

  useEffect(() => {
    muatUlang();
    if (!token) return undefined;
    // Status live berubah tanpa pemberitahuan ke halaman non-sesi, jadi
    // satu-satunya cara tahu adalah menanyakannya berkala.
    const timer = setInterval(muatUlang, REFRESH_MS);
    return () => clearInterval(timer);
  }, [muatUlang, token]);

  const nilai = useMemo(
    () => ({
      token,
      student,
      courses,
      recent,
      status,
      refresh: muatUlang,
      register: async (nim, name, password) => {
        const data = await studentApi.register(nim, name, password);
        simpan(data.token, data.student);
      },
      login: async (nim, password) => {
        const data = await studentApi.login(nim, password);
        simpan(data.token, data.student);
      },
      logout: async () => {
        // Server dikabari supaya tanda sesinya benar-benar mati, tapi kegagalan
        // jaringan tidak boleh menahan mahasiswa tetap "masuk" di layar.
        try {
          await studentApi.logout(token);
        } catch {
          // diabaikan
        }
        lupakan();
      },
      changePassword: (currentPassword, newPassword) =>
        studentApi.changePassword(token, currentPassword, newPassword),
      leaveCourse: async (slug) => {
        await studentApi.leaveCourse(token, slug);
        await muatUlang();
      },
      joinCourse: async (code) => {
        const { course } = await studentApi.joinCourse(token, code);
        await muatUlang();
        return course;
      },
    }),
    [token, student, courses, recent, status, muatUlang, simpan, lupakan],
  );

  return <StudentAuthContext.Provider value={nilai}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  const nilai = useContext(StudentAuthContext);
  if (!nilai) throw new Error("useStudentAuth harus dipakai di dalam StudentAuthProvider.");
  return nilai;
}
