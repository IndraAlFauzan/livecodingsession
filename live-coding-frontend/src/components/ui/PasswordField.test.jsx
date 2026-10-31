import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordField from "./PasswordField.jsx";

const field = () => screen.getByLabelText(/^kata sandi$/i);
const tombol = () => screen.getByRole("button");

describe("PasswordField", () => {
  it("menyembunyikan isian secara bawaan", () => {
    render(<PasswordField label="Kata sandi" value="" onChange={vi.fn()} />);

    expect(field()).toHaveAttribute("type", "password");
    expect(tombol()).toHaveAttribute("aria-pressed", "false");
  });

  it("tombol intip membuka lalu menyembunyikan lagi", async () => {
    render(<PasswordField label="Kata sandi" value="" onChange={vi.fn()} />);

    await userEvent.click(tombol());
    expect(field()).toHaveAttribute("type", "text");
    expect(tombol()).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(tombol());
    expect(field()).toHaveAttribute("type", "password");
  });

  it("namanya menyebut kolom apa yang diintip", () => {
    render(<PasswordField label="Kata sandi baru" value="" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /lihat kata sandi baru/i })).toBeInTheDocument();
  });

  // Tombolnya di dalam form, jadi harus type=button -- kalau tidak, mengintip
  // sandi malah mengirimkan formnya.
  it("tidak ikut mengirim form", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordField label="Kata sandi" value="" onChange={vi.fn()} />
      </form>,
    );

    expect(tombol()).toHaveAttribute("type", "button");
  });
});
