import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordDialog from "./PasswordDialog.jsx";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";

vi.mock("../../hooks/useStudentAuth.jsx", () => ({ useStudentAuth: vi.fn() }));

let changePassword, onClose;

function pasang() {
  changePassword = vi.fn().mockResolvedValue({ otherSessionsRevoked: 0 });
  onClose = vi.fn();
  useStudentAuth.mockReturnValue({ changePassword });
  render(<PasswordDialog onClose={onClose} />);
}

const isi = async (lama, baru, ulang) => {
  if (lama) await userEvent.type(screen.getByLabelText(/kata sandi sekarang/i), lama);
  if (baru) await userEvent.type(screen.getByLabelText(/^kata sandi baru$/i), baru);
  if (ulang) await userEvent.type(screen.getByLabelText(/ulangi/i), ulang);
  await userEvent.click(screen.getByRole("button", { name: /ganti kata sandi/i }));
};

beforeEach(() => vi.clearAllMocks());

describe("PasswordDialog", () => {
  it("menolak kolom kosong tanpa memanggil server", async () => {
    pasang();
    await isi("", "", "");

    expect(await screen.findByRole("alert")).toHaveTextContent(/isi kata sandi lama dan yang baru/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("menolak sandi baru di bawah 8 karakter", async () => {
    pasang();
    await isi("rahasia123", "pendek", "pendek");

    expect(await screen.findByRole("alert")).toHaveTextContent(/minimal 8 karakter/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  // Server tidak pernah melihat kolom ulangan, jadi ini harus dicegat di layar.
  it("menolak ulangan yang tidak sama", async () => {
    pasang();
    await isi("rahasia123", "sandibaru123", "sandibaru124");

    expect(await screen.findByRole("alert")).toHaveTextContent(/ulangan kata sandi tidak sama/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("mengirim sandi lama dan baru saat valid", async () => {
    pasang();
    await isi("rahasia123", "sandibaru123", "sandibaru123");

    expect(changePassword).toHaveBeenCalledWith("rahasia123", "sandibaru123");
  });

  it("memberi tahu berapa perangkat lain yang dikeluarkan", async () => {
    pasang();
    changePassword.mockResolvedValue({ otherSessionsRevoked: 2 });
    await isi("rahasia123", "sandibaru123", "sandibaru123");

    expect(await screen.findByText(/2 perangkat lain/i)).toBeInTheDocument();
  });

  it("tidak menyebut perangkat lain kalau memang tidak ada", async () => {
    pasang();
    await isi("rahasia123", "sandibaru123", "sandibaru123");

    expect(await screen.findByText(/kata sandi diganti/i)).toBeInTheDocument();
    expect(screen.queryByText(/perangkat lain/i)).toBeNull();
  });

  it("menampilkan pesan server saat sandi lama salah", async () => {
    pasang();
    changePassword.mockRejectedValue(new Error("Kata sandi lama salah."));
    await isi("salah-sekali", "sandibaru123", "sandibaru123");

    expect(await screen.findByRole("alert")).toHaveTextContent(/kata sandi lama salah/i);
    expect(screen.queryByText(/kata sandi diganti/i)).toBeNull();
  });

  it("Batal menutup tanpa memanggil server", async () => {
    pasang();
    await userEvent.click(screen.getByRole("button", { name: /batal/i }));

    expect(onClose).toHaveBeenCalled();
    expect(changePassword).not.toHaveBeenCalled();
  });
});
