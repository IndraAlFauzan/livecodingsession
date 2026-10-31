import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StudentAuthProvider, useStudentAuth } from "./useStudentAuth.jsx";
import { studentApi, ApiError } from "../lib/api.js";
import { storage } from "../lib/storage.js";

vi.mock("../lib/api.js", async () => {
  const asli = await vi.importActual("../lib/api.js");
  return {
    ApiError: asli.ApiError,
    studentApi: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
      home: vi.fn(),
      joinCourse: vi.fn(),
      leaveCourse: vi.fn(),
    },
  };
});

const AKUN = { nim: "1301223045", name: "Rina Aprilia" };
const KELAS = [{ slug: "pemrograman-mobile", name: "Pemrograman Mobile", joinedAt: "2026-01-01" }];

const pasang = () =>
  renderHook(() => useStudentAuth(), { wrapper: ({ children }) => <StudentAuthProvider>{children}</StudentAuthProvider> });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("tanpa tanda sesi tersimpan", () => {
  it("langsung berstatus keluar, tanpa memanggil server", () => {
    const { result } = pasang();

    expect(result.current.status).toBe("keluar");
    expect(studentApi.home).not.toHaveBeenCalled();
  });

  it("masuk menyimpan tanda sesi dan akun", async () => {
    studentApi.login.mockResolvedValue({ token: "tanda-123", student: AKUN });
    studentApi.home.mockResolvedValue({ student: AKUN, courses: KELAS, recent: [] });
    const { result } = pasang();

    await act(() => result.current.login("1301223045", "rahasia123"));

    expect(result.current.status).toBe("masuk");
    expect(result.current.student).toEqual(AKUN);
    expect(storage.getStudentToken()).toBe("tanda-123");
    await waitFor(() => expect(result.current.courses).toEqual(KELAS));
  });

  it("daftar juga langsung membuat sesi", async () => {
    studentApi.register.mockResolvedValue({ token: "tanda-baru", student: AKUN });
    studentApi.home.mockResolvedValue({ student: AKUN, courses: [], recent: [] });
    const { result } = pasang();

    await act(() => result.current.register("1301223045", "Rina Aprilia", "rahasia123"));

    expect(result.current.status).toBe("masuk");
    expect(storage.getStudentToken()).toBe("tanda-baru");
  });
});

describe("dengan tanda sesi tersimpan", () => {
  beforeEach(() => storage.setStudentToken("tanda-123"));

  // Tanpa status 'memuat', layar masuk sempat berkedip muncul untuk mahasiswa
  // yang sebenarnya sudah masuk.
  it("mulai dari status memuat, bukan keluar", () => {
    studentApi.home.mockReturnValue(new Promise(() => {}));
    const { result } = pasang();

    expect(result.current.status).toBe("memuat");
  });

  it("memulihkan akun dan riwayat dari server", async () => {
    studentApi.home.mockResolvedValue({ student: AKUN, courses: KELAS, recent: [] });
    const { result } = pasang();

    await waitFor(() => expect(result.current.status).toBe("masuk"));
    expect(result.current.student).toEqual(AKUN);
    expect(result.current.courses).toEqual(KELAS);
  });

  it("401 berarti tanda sesi mati: dibuang dan status jadi keluar", async () => {
    studentApi.home.mockRejectedValue(new ApiError("Silakan masuk dulu.", 401));
    const { result } = pasang();

    await waitFor(() => expect(result.current.status).toBe("keluar"));
    expect(storage.getStudentToken()).toBeNull();
  });

  // Jaringan kampus sering putus sebentar. Kalau setiap kegagalan memaksa
  // keluar, mahasiswa harus mengetik sandi ulang tanpa alasan.
  it("gagal jaringan tidak memaksa keluar", async () => {
    studentApi.home.mockRejectedValue(new ApiError("Tidak bisa terhubung ke server.", 0));
    const { result } = pasang();

    await waitFor(() => expect(result.current.status).toBe("masuk"));
    expect(storage.getStudentToken()).toBe("tanda-123");
  });

  it("keluar membuang tanda sesi walau server gagal dihubungi", async () => {
    studentApi.home.mockResolvedValue({ student: AKUN, courses: KELAS, recent: [] });
    studentApi.logout.mockRejectedValue(new ApiError("Tidak bisa terhubung ke server.", 0));
    const { result } = pasang();
    await waitFor(() => expect(result.current.status).toBe("masuk"));

    await act(() => result.current.logout());

    expect(result.current.status).toBe("keluar");
    expect(storage.getStudentToken()).toBeNull();
  });

  it("gabung kelas memuat ulang riwayat dari server", async () => {
    studentApi.home.mockResolvedValueOnce({ student: AKUN, courses: [], recent: [] });
    studentApi.joinCourse.mockResolvedValue({ course: KELAS[0] });
    studentApi.home.mockResolvedValueOnce({ student: AKUN, courses: KELAS, recent: [] });
    const { result } = pasang();
    await waitFor(() => expect(result.current.status).toBe("masuk"));

    await act(() => result.current.joinCourse("PM-ABC123"));

    expect(studentApi.joinCourse).toHaveBeenCalledWith("tanda-123", "PM-ABC123");
    await waitFor(() => expect(result.current.courses).toEqual(KELAS));
  });

  it("keluar dari kelas memuat ulang riwayat dari server", async () => {
    studentApi.home.mockResolvedValueOnce({ student: AKUN, courses: KELAS, recent: [] });
    studentApi.home.mockResolvedValueOnce({ student: AKUN, courses: [], recent: [] });
    const { result } = pasang();
    await waitFor(() => expect(result.current.courses).toEqual(KELAS));

    await act(() => result.current.leaveCourse("pemrograman-mobile"));

    expect(studentApi.leaveCourse).toHaveBeenCalledWith("tanda-123", "pemrograman-mobile");
    await waitFor(() => expect(result.current.courses).toEqual([]));
  });
});
