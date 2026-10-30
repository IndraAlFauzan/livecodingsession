import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { studentApi } from "../lib/api.js";
import { storage } from "../lib/storage.js";

const StudentAuthContext = createContext(null);

// Satu sumber kebenaran untuk "siapa yang sedang masuk" dan "kelas apa saja yang
// dia ikuti". Keduanya datang dari server, jadi berpindah perangkat tidak
// menghilangkan riwayat seperti pada versi yang menyimpannya di localStorage.
export function StudentAuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.getStudentToken());
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  // 'memuat' sampai tanda sesi tersimpan selesai diperiksa ke server; tanpa ini
  // layar masuk sempat berkedip muncul padahal mahasiswa sudah masuk.
  const [status, setStatus] = useState(token ? "memuat" : "keluar");

  const simpan = useCallback((tandaSesi, akun) => {
    storage.setStudentToken(tandaSesi);
    setToken(tandaSesi);
    setStudent(akun);
    setCourses([]);
    setStatus("masuk");
  }, []);

  const lupakan = useCallback(() => {
    storage.setStudentToken(null);
    setToken(null);
    setStudent(null);
    setCourses([]);
    setStatus("keluar");
  }, []);

  const muatUlang = useCallback(async () => {
    if (!token) return;
    try {
      const data = await studentApi.me(token);
      setStudent(data.student);
      setCourses(data.courses);
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
  }, [muatUlang]);

  const nilai = useMemo(
    () => ({
      token,
      student,
      courses,
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
    [token, student, courses, status, muatUlang, simpan, lupakan],
  );

  return <StudentAuthContext.Provider value={nilai}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  const nilai = useContext(StudentAuthContext);
  if (!nilai) throw new Error("useStudentAuth harus dipakai di dalam StudentAuthProvider.");
  return nilai;
}
