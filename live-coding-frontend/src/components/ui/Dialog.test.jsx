import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dialog from "./Dialog.jsx";

const buka = (props = {}) =>
  render(
    <Dialog
      title="Hapus Pemrograman Mobile?"
      text="Semua pertemuan ikut terhapus."
      confirmLabel="Ya, hapus permanen"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  );

describe("Dialog", () => {
  it("fokus awal ada di Batal, bukan di tombol merusak", () => {
    buka();
    expect(screen.getByRole("button", { name: "Batal" })).toHaveFocus();
  });

  it("Esc membatalkan", async () => {
    const onCancel = vi.fn();
    buka({ onCancel });
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("Tab terkunci di dalam dialog", async () => {
    buka();
    const batal = screen.getByRole("button", { name: "Batal" });
    const hapus = screen.getByRole("button", { name: "Ya, hapus permanen" });

    await userEvent.tab();
    expect(hapus).toHaveFocus();
    await userEvent.tab();
    expect(batal).toHaveFocus();
  });

  it("Shift+Tab dari elemen pertama melompat ke elemen terakhir", async () => {
    buka();
    const hapus = screen.getByRole("button", { name: "Ya, hapus permanen" });
    await userEvent.tab({ shift: true });
    expect(hapus).toHaveFocus();
  });

  it("fokus yang kabur ke luar ditarik kembali", async () => {
    const { container } = buka();
    const luar = document.createElement("button");
    container.appendChild(luar);

    luar.focus();
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Batal" })).toHaveFocus(),
    );
  });

  it("judul dan penjelasan terhubung ke dialog lewat aria", () => {
    buka();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Hapus Pemrograman Mobile?");
    expect(dialog).toHaveAccessibleDescription("Semua pertemuan ikut terhapus.");
  });
});
