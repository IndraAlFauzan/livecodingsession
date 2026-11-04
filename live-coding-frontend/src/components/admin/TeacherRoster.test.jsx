import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherRoster from "./TeacherRoster.jsx";

const DOSEN = [
  { id: 1, code: "OCH", name: "Oktaviani Cahya H.", username: "och", courseCount: 3, active: true, lastLogin: "2026-11-04T02:00:00.000Z" },
  { id: 2, code: "RDP", name: "Rizki Dwi P.", username: "rdp", courseCount: 1, active: true, lastLogin: null },
];

let api;

function pasang(teachers = DOSEN) {
  api = {
    teachers: vi.fn().mockResolvedValue({ teachers }),
    createTeacher: vi.fn(),
    resetTeacherPassword: vi.fn(),
    setTeacherActive: vi.fn().mockResolvedValue({}),
  };
  render(<TeacherRoster api={api} onError={vi.fn()} />);
}

beforeEach(() => vi.clearAllMocks());

describe("TeacherRoster", () => {
  it("menampilkan kode dosen dan jumlah mata kuliahnya", async () => {
    pasang();

    expect(await screen.findByText("OCH")).toBeInTheDocument();
    expect(screen.getByText("Oktaviani Cahya H.")).toBeInTheDocument();
  });

  it("menandai dosen yang belum pernah masuk", async () => {
    pasang();

    expect(await screen.findByText(/belum pernah/i)).toBeInTheDocument();
  });

  it("tanpa dosen, menjelaskan akibatnya", async () => {
    pasang([]);

    expect(await screen.findByText(/belum ada akun dosen/i)).toBeInTheDocument();
  });

  it("membuat akun dengan username, kode, dan nama", async () => {
    pasang();
    api.createTeacher.mockResolvedValue({
      teacher: { id: 3, code: "ABC", name: "Dosen Baru" },
      password: "QH5Z-74AP-ZPDZ",
    });
    await userEvent.click(await screen.findByRole("button", { name: /tambah dosen/i }));
    await userEvent.type(screen.getByLabelText(/username/i), "baru");
    await userEvent.type(screen.getByLabelText(/kode dosen/i), "abc");
    await userEvent.type(screen.getByLabelText(/nama lengkap/i), "Dosen Baru");
    await userEvent.click(screen.getByRole("button", { name: /buat akun/i }));

    expect(api.createTeacher).toHaveBeenCalledWith("baru", "ABC", "Dosen Baru");
  });

  it("kode dosen jadi huruf besar saat diketik", async () => {
    pasang();
    await userEvent.click(await screen.findByRole("button", { name: /tambah dosen/i }));
    await userEvent.type(screen.getByLabelText(/kode dosen/i), "och");

    expect(screen.getByLabelText(/kode dosen/i)).toHaveValue("OCH");
  });

  // Sandi hanya tampil sekali; admin harus mencatatnya saat itu juga.
  it("menampilkan sandi awal sekali, lalu hilang", async () => {
    pasang();
    api.createTeacher.mockResolvedValue({
      teacher: { id: 3, code: "ABC", name: "Dosen Baru" },
      password: "QH5Z-74AP-ZPDZ",
    });
    await userEvent.click(await screen.findByRole("button", { name: /tambah dosen/i }));
    await userEvent.type(screen.getByLabelText(/username/i), "baru");
    await userEvent.type(screen.getByLabelText(/kode dosen/i), "abc");
    await userEvent.type(screen.getByLabelText(/nama lengkap/i), "Dosen Baru");
    await userEvent.click(screen.getByRole("button", { name: /buat akun/i }));

    expect(await screen.findByText("QH5Z-74AP-ZPDZ")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /sudah saya catat/i }));
    await waitFor(() => expect(screen.queryByText("QH5Z-74AP-ZPDZ")).toBeNull());
  });

  // Reset mencabut semua sesi dosen itu; jangan sampai karena salah klik.
  it("meminta konfirmasi sebelum mereset", async () => {
    pasang();
    const baris = (await screen.findByText("Rizki Dwi P.")).closest("tr");
    await userEvent.click(baris.querySelector("button"));

    expect(screen.getByRole("alertdialog")).toHaveTextContent(/reset kata sandi rizki/i);
    expect(api.resetTeacherPassword).not.toHaveBeenCalled();
  });

  it("mereset dosen yang dipilih, bukan baris pertama", async () => {
    pasang();
    api.resetTeacherPassword.mockResolvedValue({
      teacher: { id: 2, code: "RDP", name: "Rizki Dwi P." },
      password: "AAAA-BBBB-CCCC",
    });
    const baris = (await screen.findByText("Rizki Dwi P.")).closest("tr");
    await userEvent.click(baris.querySelector("button"));
    await userEvent.click(screen.getByRole("button", { name: /ya, reset sandi/i }));

    expect(api.resetTeacherPassword).toHaveBeenCalledWith(2);
  });

  it("menonaktifkan dosen lewat switch", async () => {
    pasang();
    const baris = (await screen.findByText("Oktaviani Cahya H.")).closest("tr");
    await userEvent.click(baris.querySelector("input[role=switch]"));

    expect(api.setTeacherActive).toHaveBeenCalledWith(1, false);
  });
});
