import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Segmented from "./Segmented.jsx";

const ITEMS = [{ label: "Masuk" }, { label: "Daftar" }];

describe("Segmented", () => {
  it("menandai pilihan yang aktif", () => {
    render(<Segmented items={ITEMS} value={1} onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Daftar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Masuk" })).toHaveAttribute("aria-selected", "false");
  });

  it("melaporkan indeks yang diklik", async () => {
    const onChange = vi.fn();
    render(<Segmented items={ITEMS} value={0} onChange={onChange} />);

    await userEvent.click(screen.getByRole("tab", { name: "Daftar" }));

    expect(onChange).toHaveBeenCalledWith(1);
  });

  // Dipakai di dalam form; tanpa type=button, memilih mode malah mengirim form.
  it("tombolnya tidak ikut mengirim form", () => {
    render(<Segmented items={ITEMS} value={0} onChange={vi.fn()} />);

    for (const tab of screen.getAllByRole("tab")) expect(tab).toHaveAttribute("type", "button");
  });

  it("menerima daftar kosong tanpa meledak", () => {
    render(<Segmented items={undefined} value={0} onChange={vi.fn()} />);

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
