import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage.jsx";
import { useStudentAuth } from "../hooks/useStudentAuth.jsx";
import { storage } from "../lib/storage.js";

vi.mock("../hooks/useStudentAuth.jsx", () => ({ useStudentAuth: vi.fn() }));

const AKUN = { nim: "1301223045", name: "Rina Aprilia" };
const SEPI = { slug: "basis-data", name: "Basis Data", meetingCount: 2, latest: { number: 2, title: "Normalisasi" }, live: null };
const LIVE = {
  slug: "pemrograman-mobile",
  name: "Pemrograman Mobile",
  meetingCount: 7,
  latest: { number: 7, title: "Provider" },
  live: { id: "p7", number: 7, title: "Provider", startedAt: "2026-10-31T01:00:00.000Z", reconnecting: false },
};

function pasang({ courses = [], recent = [] } = {}) {
  useStudentAuth.mockReturnValue({ student: AKUN, courses, recent });
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("HomePage", () => {
  it("menyapa dengan nama depan saja", () => {
    pasang({ courses: [SEPI] });

    expect(screen.getByRole("heading", { name: "Halo, Rina" })).toBeInTheDocument();
  });

  it("mengarahkan ke kode akses kalau belum mengikuti apa pun", () => {
    pasang();

    expect(screen.getByText(/mulai dari kode akses dosen/i)).toBeInTheDocument();
    expect(screen.queryByText(/tidak ada sesi/i)).toBeNull();
  });

  // Yang paling sering ditanya saat membuka aplikasi, jadi harus terjawab
  // tanpa menggulir -- termasuk saat jawabannya "tidak ada".
  it("mengabarkan dengan tenang kalau tidak ada yang live", () => {
    pasang({ courses: [SEPI] });

    expect(screen.getByText(/tidak ada sesi yang sedang berlangsung/i)).toBeInTheDocument();
  });

  it("menonjolkan sesi yang sedang live", () => {
    pasang({ courses: [SEPI, LIVE] });

    expect(screen.getByText("Pemrograman Mobile")).toBeInTheDocument();
    expect(screen.getByText(/Pertemuan 7, Provider/)).toBeInTheDocument();
    expect(screen.queryByText(/tidak ada sesi yang sedang berlangsung/i)).toBeNull();
  });

  it("mata kuliah tanpa sesi tidak ikut jadi kartu live", () => {
    pasang({ courses: [SEPI, LIVE] });

    expect(screen.queryByText("Basis Data")).toBeNull();
  });

  it("memberi tahu saat koneksi dosen terputus", () => {
    pasang({ courses: [{ ...LIVE, live: { ...LIVE.live, reconnecting: true } }] });

    expect(screen.getByText(/koneksi dosen terputus/i)).toBeInTheDocument();
  });

  // Tombol Fokus harus ikut menyimpan pilihannya, bukan sekadar membuka sekali.
  it("tombol Fokus menyimpan pilihan layar penuh", async () => {
    pasang({ courses: [LIVE] });
    await userEvent.click(screen.getByRole("button", { name: /fokus/i }));

    expect(storage.getFocusMode()).toBe(true);
  });

  it("menampilkan riwayat yang terakhir dibuka", () => {
    pasang({
      courses: [SEPI],
      recent: [
        {
          course: { slug: "basis-data", name: "Basis Data" },
          meeting: { id: "m2", number: 2, title: "Normalisasi", status: "finished" },
          lastSeen: "2026-10-30T02:00:00.000Z",
        },
      ],
    });

    expect(screen.getByText(/terakhir kamu buka/i)).toBeInTheDocument();
    expect(screen.getByText(/Pertemuan 2, Normalisasi/)).toBeInTheDocument();
  });

  it("tidak menampilkan bagian riwayat kalau kosong", () => {
    pasang({ courses: [SEPI] });

    expect(screen.queryByText(/terakhir kamu buka/i)).toBeNull();
  });
});
