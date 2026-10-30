import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinCard from "./JoinCard.jsx";
import { studentApi } from "../../lib/api.js";
import { storage } from "../../lib/storage.js";

vi.mock("../../lib/api.js", () => ({ studentApi: { access: vi.fn() } }));
vi.mock("../../lib/storage.js", () => ({
  storage: { getStudentName: vi.fn(() => ""), setStudentName: vi.fn(), saveCourse: vi.fn() },
}));

const isi = async (nama, kode) => {
  const user = userEvent.setup();
  if (nama) await user.type(screen.getByLabelText(/nama lengkap/i), nama);
  if (kode) await user.type(screen.getByLabelText(/kode akses/i), kode);
  await user.click(screen.getByRole("button", { name: /masuk kelas/i }));
  return user;
};

beforeEach(() => vi.clearAllMocks());

describe("JoinCard", () => {
  it("menolak submit kosong tanpa memanggil server", async () => {
    render(<JoinCard onSuccess={vi.fn()} />);
    await isi("", "");

    expect(await screen.findByRole("alert")).toHaveTextContent(/isi nama lengkap dan kode akses/i);
    expect(studentApi.access).not.toHaveBeenCalled();
  });

  it("mengubah kode jadi huruf besar saat diketik", async () => {
    render(<JoinCard onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/kode akses/i), "pm-abc123");

    expect(screen.getByLabelText(/kode akses/i)).toHaveValue("PM-ABC123");
  });

  it("menyimpan nama dan mata kuliah lalu memanggil onSuccess saat kode benar", async () => {
    const course = { slug: "pemrograman-mobile", name: "Pemrograman Mobile" };
    studentApi.access.mockResolvedValue({ course });
    const onSuccess = vi.fn();

    render(<JoinCard onSuccess={onSuccess} />);
    await isi("Rina Aprilia", "pm-abc123");

    expect(studentApi.access).toHaveBeenCalledWith("PM-ABC123");
    expect(storage.setStudentName).toHaveBeenCalledWith("Rina Aprilia");
    expect(storage.saveCourse).toHaveBeenCalledWith("pemrograman-mobile", "Pemrograman Mobile", "PM-ABC123");
    expect(onSuccess).toHaveBeenCalledWith(course);
  });

  it("menampilkan pesan server saat kode salah, dan tidak menyimpan apa pun", async () => {
    studentApi.access.mockRejectedValue(new Error("Kode akses tidak valid atau sudah dinonaktifkan."));

    render(<JoinCard onSuccess={vi.fn()} />);
    await isi("Rina Aprilia", "salah");

    expect(await screen.findByRole("alert")).toHaveTextContent(/tidak valid atau sudah dinonaktifkan/i);
    expect(storage.saveCourse).not.toHaveBeenCalled();
  });

  it("menolak kode milik mata kuliah lain saat dibuka dari halaman mata kuliah", async () => {
    studentApi.access.mockResolvedValue({ course: { slug: "basis-data", name: "Basis Data" } });
    const onSuccess = vi.fn();

    render(<JoinCard expectedSlug="pemrograman-mobile" onSuccess={onSuccess} />);
    await isi("Rina Aprilia", "bd-xyz");

    expect(await screen.findByRole("alert")).toHaveTextContent(/untuk mata kuliah lain \(Basis Data\)/i);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(storage.saveCourse).not.toHaveBeenCalled();
  });
});
