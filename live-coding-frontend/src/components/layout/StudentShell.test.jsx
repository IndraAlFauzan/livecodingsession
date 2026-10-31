import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StudentShell from "./StudentShell.jsx";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";

vi.mock("../../hooks/useStudentAuth.jsx", () => ({ useStudentAuth: vi.fn() }));

const KELAS = [
  { slug: "pemrograman-mobile", name: "Pemrograman Mobile" },
  { slug: "basis-data", name: "Basis Data" },
];

// Halaman tiruan yang hanya mencetak URL-nya, supaya tes memeriksa ke mana
// navigasi benar-benar pergi.
const Jejak = () => <div data-testid="url" />;

function pasang(awal = "/mk", courses = KELAS) {
  useStudentAuth.mockReturnValue({ courses });
  render(
    <MemoryRouter initialEntries={[awal]}>
      <Routes>
        <Route element={<StudentShell />}>
          <Route path="/" element={<Jejak />} />
          <Route path="/mk" element={<Jejak />} />
          <Route path="/mk/:slug" element={<Jejak />} />
          <Route path="/akun" element={<Jejak />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// Dibatasi ke .lc-nav: tombol "+" punya aria-label "Gabung mata kuliah" yang
// ikut cocok kalau dicari lewat seluruh dokumen.
const nav = (nama) => {
  const cocok = [...document.querySelectorAll(".lc-sidebar .lc-nav")].filter((n) =>
    new RegExp(nama, "i").test(n.textContent),
  );
  if (cocok.length !== 1) throw new Error(`butuh 1 nav "${nama}", dapat ${cocok.length}`);
  return cocok[0];
};
const aktif = () =>
  [...document.querySelectorAll(".lc-sidebar .lc-nav")]
    .filter((n) => n.getAttribute("aria-current") === "page")
    .map((n) => n.textContent.trim());

beforeEach(() => vi.clearAllMocks());

describe("StudentShell", () => {
  it("menampilkan menu dan daftar mata kuliah yang diikuti", () => {
    pasang();

    expect(nav("Beranda")).toBeInTheDocument();
    expect(nav("Akun")).toBeInTheDocument();
    expect(nav("Pemrograman Mobile")).toBeInTheDocument();
  });

  it("jumlah mata kuliah ikut di menu", () => {
    pasang();

    expect(nav("Mata kuliah")).toHaveTextContent("2");
  });

  it("menandai halaman yang sedang dibuka", () => {
    pasang("/akun");

    expect(aktif()).toEqual(["Akun"]);
  });

  // Mata kuliah adalah cabang, jadi /mk/:slug harus tetap menyorot menunya --
  // bukan hanya /mk persis.
  it("menu Mata kuliah tetap tersorot saat membuka salah satu mata kuliah", () => {
    pasang("/mk/pemrograman-mobile");

    expect(aktif()).toContain("Mata kuliah2");
  });

  it("mata kuliah yang sedang dibuka ikut ditandai di daftar", () => {
    pasang("/mk/pemrograman-mobile");

    expect(aktif()).toContain("Pemrograman Mobile");
  });

  it("memilih mata kuliah membuka halamannya", async () => {
    pasang("/mk");
    await userEvent.click(nav("Basis Data"));

    expect(aktif()).toContain("Basis Data");
  });

  it("tanpa mata kuliah, daftarnya kosong tapi menu tetap ada", () => {
    pasang("/mk", []);

    expect(nav("Mata kuliah")).toBeInTheDocument();
    expect(screen.getByText(/belum ada mata kuliah/i)).toBeInTheDocument();
  });
});
