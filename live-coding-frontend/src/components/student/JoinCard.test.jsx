import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinCard from "./JoinCard.jsx";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";

vi.mock("../../hooks/useStudentAuth.jsx", () => ({ useStudentAuth: vi.fn() }));

let joinCourse;

function pasang(props = {}) {
  joinCourse = vi.fn();
  useStudentAuth.mockReturnValue({ joinCourse });
  return render(<JoinCard onSuccess={vi.fn()} {...props} />);
}

const kirim = async (kode) => {
  const user = userEvent.setup();
  if (kode) await user.type(screen.getByLabelText(/kode akses/i), kode);
  await user.click(screen.getByRole("button", { name: /gabung/i }));
};

beforeEach(() => vi.clearAllMocks());

describe("JoinCard", () => {
  it("menolak submit kosong tanpa memanggil server", async () => {
    pasang();
    await kirim("");

    expect(await screen.findByRole("alert")).toHaveTextContent(/isi kode akses/i);
    expect(joinCourse).not.toHaveBeenCalled();
  });

  it("mengubah kode jadi huruf besar saat diketik", async () => {
    pasang();
    await userEvent.type(screen.getByLabelText(/kode akses/i), "pm-abc123");

    expect(screen.getByLabelText(/kode akses/i)).toHaveValue("PM-ABC123");
  });

  it("tidak lagi meminta nama -- identitas datang dari akun", () => {
    pasang();

    expect(screen.queryByLabelText(/nama/i)).toBeNull();
  });

  it("bergabung lalu memanggil onSuccess saat kode benar", async () => {
    const course = { slug: "pemrograman-mobile", name: "Pemrograman Mobile" };
    const onSuccess = vi.fn();
    pasang({ onSuccess });
    joinCourse.mockResolvedValue(course);

    await kirim("pm-abc123");

    expect(joinCourse).toHaveBeenCalledWith("PM-ABC123");
    expect(onSuccess).toHaveBeenCalledWith(course);
  });

  it("mengosongkan kolom setelah berhasil supaya siap untuk kelas berikutnya", async () => {
    pasang();
    joinCourse.mockResolvedValue({ slug: "pemrograman-mobile", name: "Pemrograman Mobile" });

    await kirim("pm-abc123");

    expect(screen.getByLabelText(/kode akses/i)).toHaveValue("");
  });

  it("menampilkan pesan server saat kode salah", async () => {
    pasang();
    joinCourse.mockRejectedValue(new Error("Kode akses tidak valid atau sudah dinonaktifkan."));

    await kirim("salah");

    expect(await screen.findByRole("alert")).toHaveTextContent(/tidak valid atau sudah dinonaktifkan/i);
  });

  it("menolak kode milik mata kuliah lain saat dibuka dari halaman mata kuliah", async () => {
    const onSuccess = vi.fn();
    pasang({ expectedSlug: "pemrograman-mobile", onSuccess });
    joinCourse.mockResolvedValue({ slug: "basis-data", name: "Basis Data" });

    await kirim("bd-xyz");

    expect(await screen.findByRole("alert")).toHaveTextContent(/untuk mata kuliah lain \(Basis Data\)/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
