import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TeacherCode from "./TeacherCode.jsx";

describe("TeacherCode", () => {
  it("menampilkan kode dosen", () => {
    render(<TeacherCode teacher={{ code: "OCH", name: "Oktaviani Cahya H." }} />);

    expect(screen.getByText("OCH")).toBeInTheDocument();
  });

  it("nama lengkap ada di tooltip, bukan di barisnya", () => {
    render(<TeacherCode teacher={{ code: "OCH", name: "Oktaviani Cahya H." }} />);

    expect(screen.getByText("OCH")).toHaveAttribute("title", "Oktaviani Cahya H.");
    expect(screen.queryByText(/Oktaviani/)).toBeNull();
  });

  // Mata kuliah milik admin kampus belum punya dosen; jangan memaksa ada kode.
  it("tidak menampilkan apa pun tanpa dosen", () => {
    const { container } = render(<TeacherCode teacher={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("tidak menampilkan apa pun kalau kodenya kosong", () => {
    const { container } = render(<TeacherCode teacher={{ name: "Tanpa kode" }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("tanpa nama, tetap menampilkan kodenya tanpa tooltip kosong", () => {
    render(<TeacherCode teacher={{ code: "ABC" }} />);

    expect(screen.getByText("ABC")).not.toHaveAttribute("title");
  });
});
