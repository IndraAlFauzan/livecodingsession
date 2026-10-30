import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthCard from "./AuthCard.jsx";
import { useStudentAuth } from "../../hooks/useStudentAuth.jsx";

vi.mock("../../hooks/useStudentAuth.jsx", () => ({ useStudentAuth: vi.fn() }));

let login, register;

function pasang() {
  login = vi.fn().mockResolvedValue();
  register = vi.fn().mockResolvedValue();
  useStudentAuth.mockReturnValue({ login, register });
  return render(<AuthCard />);
}

const keDaftar = () => userEvent.click(screen.getByRole("tab", { name: /daftar/i }));
const kirim = () => userEvent.click(screen.getByRole("button", { name: /^(masuk|daftar)$/i }));

beforeEach(() => vi.clearAllMocks());

describe("AuthCard", () => {
  it("mulai di tab masuk, tanpa kolom nama", () => {
    pasang();

    expect(screen.getByRole("tab", { name: /masuk/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText(/nama lengkap/i)).toBeNull();
  });

  it("tab daftar menampilkan kolom nama", async () => {
    pasang();
    await keDaftar();

    expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
  });

  it("masuk mengirim NIM dan kata sandi", async () => {
    pasang();
    await userEvent.type(screen.getByLabelText(/nim/i), "1301223045");
    await userEvent.type(screen.getByLabelText(/kata sandi/i), "rahasia123");
    await kirim();

    expect(login).toHaveBeenCalledWith("1301223045", "rahasia123");
  });

  it("NIM dijadikan huruf besar saat diketik", async () => {
    pasang();
    await userEvent.type(screen.getByLabelText(/nim/i), "uji123ab");

    expect(screen.getByLabelText(/nim/i)).toHaveValue("UJI123AB");
  });

  it("daftar mengirim NIM, nama, dan kata sandi", async () => {
    pasang();
    await keDaftar();
    await userEvent.type(screen.getByLabelText(/nim/i), "1301223045");
    await userEvent.type(screen.getByLabelText(/nama lengkap/i), "Rina Aprilia");
    await userEvent.type(screen.getByLabelText(/kata sandi/i), "rahasia123");
    await kirim();

    expect(register).toHaveBeenCalledWith("1301223045", "Rina Aprilia", "rahasia123");
  });

  // Dicegat di layar supaya mahasiswa tidak menunggu bolak-balik ke server
  // hanya untuk tahu sandinya kependekan. Server tetap memeriksa hal yang sama.
  it("menolak kata sandi di bawah 8 karakter tanpa memanggil server", async () => {
    pasang();
    await keDaftar();
    await userEvent.type(screen.getByLabelText(/nim/i), "1301223045");
    await userEvent.type(screen.getByLabelText(/nama lengkap/i), "Rina Aprilia");
    await userEvent.type(screen.getByLabelText(/kata sandi/i), "pendek");
    await kirim();

    expect(await screen.findByRole("alert")).toHaveTextContent(/minimal 8 karakter/i);
    expect(register).not.toHaveBeenCalled();
  });

  it("menolak kolom kosong tanpa memanggil server", async () => {
    pasang();
    await kirim();

    expect(await screen.findByRole("alert")).toHaveTextContent(/isi nim dan kata sandi/i);
    expect(login).not.toHaveBeenCalled();
  });

  it("menampilkan pesan server saat NIM atau sandi salah", async () => {
    pasang();
    login.mockRejectedValue(new Error("NIM atau kata sandi salah."));
    await userEvent.type(screen.getByLabelText(/nim/i), "1301223045");
    await userEvent.type(screen.getByLabelText(/kata sandi/i), "salahsekali");
    await kirim();

    expect(await screen.findByRole("alert")).toHaveTextContent(/nim atau kata sandi salah/i);
  });

  // Sandi yang sudah diketik tidak boleh ikut berpindah tab: di tab daftar
  // artinya sandi baru, di tab masuk artinya sandi lama.
  it("mengosongkan kata sandi dan pesan galat saat pindah tab", async () => {
    pasang();
    await userEvent.type(screen.getByLabelText(/kata sandi/i), "rahasia123");
    await keDaftar();

    expect(screen.getByLabelText(/kata sandi/i)).toHaveValue("");
  });
});
