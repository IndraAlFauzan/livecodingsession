import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentRoster from "./StudentRoster.jsx";

const MAHASISWA = [
  { nim: "1301223045", name: "Rina Aprilia", joinedAt: "2026-10-01T02:00:00.000Z", lastLogin: "2026-10-30T02:00:00.000Z" },
  { nim: "1301223088", name: "Budi Santoso", joinedAt: "2026-10-02T02:00:00.000Z", lastLogin: null },
];

let api;

function pasang(students = MAHASISWA) {
  api = {
    courseStudents: vi.fn().mockResolvedValue({ students }),
    resetStudentPassword: vi.fn(),
  };
  render(<StudentRoster api={api} courseId={1} onError={vi.fn()} />);
}

const resetMilik = async (nama) => {
  const baris = (await screen.findByText(nama)).closest("tr");
  await userEvent.click(baris.querySelector("button"));
  await userEvent.click(screen.getByRole("button", { name: /ya, reset sandi/i }));
};

beforeEach(() => vi.clearAllMocks());

describe("StudentRoster", () => {
  it("menampilkan anggota kelas beserta NIM", async () => {
    pasang();

    expect(await screen.findByText("Rina Aprilia")).toBeInTheDocument();
    expect(screen.getByText("1301223045")).toBeInTheDocument();
  });

  it("menandai mahasiswa yang belum pernah masuk", async () => {
    pasang();

    expect(await screen.findByText(/belum pernah/i)).toBeInTheDocument();
  });

  it("kelas kosong tidak menampilkan tabel", async () => {
    pasang([]);

    expect(await screen.findByText(/belum ada mahasiswa yang bergabung/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  // Reset mencabut semua sesi mahasiswa, jadi tidak boleh terjadi karena salah klik.
  it("meminta konfirmasi sebelum mereset", async () => {
    pasang();
    const baris = (await screen.findByText("Rina Aprilia")).closest("tr");
    await userEvent.click(baris.querySelector("button"));

    expect(screen.getByRole("alertdialog")).toHaveTextContent(/reset kata sandi rina aprilia/i);
    expect(api.resetStudentPassword).not.toHaveBeenCalled();
  });

  it("batal tidak memanggil server", async () => {
    pasang();
    const baris = (await screen.findByText("Rina Aprilia")).closest("tr");
    await userEvent.click(baris.querySelector("button"));
    await userEvent.click(screen.getByRole("button", { name: /batal/i }));

    expect(api.resetStudentPassword).not.toHaveBeenCalled();
  });

  it("mereset mahasiswa yang dipilih, bukan baris pertama", async () => {
    pasang();
    api.resetStudentPassword.mockResolvedValue({
      student: { nim: "1301223088", name: "Budi Santoso" },
      password: "QH5Z-74AP-ZPDZ",
    });

    await resetMilik("Budi Santoso");

    expect(api.resetStudentPassword).toHaveBeenCalledWith("1301223088");
  });

  it("menampilkan sandi sementara sekali, lalu hilang setelah ditutup", async () => {
    pasang();
    api.resetStudentPassword.mockResolvedValue({
      student: { nim: "1301223045", name: "Rina Aprilia" },
      password: "QH5Z-74AP-ZPDZ",
    });

    await resetMilik("Rina Aprilia");
    expect(await screen.findByText("QH5Z-74AP-ZPDZ")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /sudah saya catat/i }));
    await waitFor(() => expect(screen.queryByText("QH5Z-74AP-ZPDZ")).toBeNull());
  });

  it("galat server tidak menampilkan jendela sandi", async () => {
    const onError = vi.fn();
    api = {
      courseStudents: vi.fn().mockResolvedValue({ students: MAHASISWA }),
      resetStudentPassword: vi.fn().mockRejectedValue(new Error("Server error (500).")),
    };
    render(<StudentRoster api={api} courseId={1} onError={onError} />);

    await resetMilik("Rina Aprilia");

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.queryByText(/sudah saya catat/i)).toBeNull();
  });
});
