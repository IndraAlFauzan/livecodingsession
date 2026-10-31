import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderMarkdown, isMarkdown } from "./markdown.jsx";

const tampil = (sumber) => render(<div data-testid="md">{renderMarkdown(sumber)}</div>);
const akar = () => screen.getByTestId("md");

describe("keamanan", () => {
  // Inti keputusan desainnya: README datang dari folder dosen, termasuk repo
  // yang dia clone entah dari mana. Tidak boleh ada HTML yang benar-benar hidup.
  it("HTML mentah tampil sebagai teks, bukan elemen", () => {
    tampil('<script>alert(1)</script>');

    expect(akar().querySelector("script")).toBeNull();
    expect(akar().textContent).toContain("<script>alert(1)</script>");
  });

  it("atribut penyerang pada img tidak pernah jadi elemen", () => {
    tampil('<img src=x onerror="alert(1)">');

    expect(akar().querySelector("img")).toBeNull();
    expect(akar().textContent).toContain("onerror");
  });

  it("tautan javascript: turun jadi teks biasa", () => {
    tampil("[klik](javascript:alert(1))");

    expect(akar().querySelector("a")).toBeNull();
    expect(akar().textContent).toContain("klik");
  });

  it("tautan data: juga ditolak", () => {
    tampil("[x](data:text/html;base64,PHNjcmlwdD4=)");

    expect(akar().querySelector("a")).toBeNull();
  });

  it("tautan http dan mailto diizinkan dan dibuka aman", () => {
    tampil("[situs](https://telkomuniversity.ac.id) dan [surel](mailto:a@b.c)");
    const tautan = akar().querySelectorAll("a");

    expect(tautan).toHaveLength(2);
    expect(tautan[0]).toHaveAttribute("href", "https://telkomuniversity.ac.id");
    expect(tautan[0]).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  // Gambar tidak pernah dimuat: isinya memang tidak dikirim backend, dan URL
  // luar akan membocorkan ke server lain.
  it("gambar jadi penanda teks, tidak pernah memuat apa pun", () => {
    tampil("![diagram alur](https://contoh.com/lacak.png)");

    expect(akar().querySelector("img")).toBeNull();
    expect(screen.getByText("diagram alur")).toBeInTheDocument();
  });
});

describe("blok", () => {
  it("judul sesuai tingkatnya", () => {
    tampil("# Satu\n## Dua\n###### Enam");

    expect(screen.getByRole("heading", { level: 1, name: "Satu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Dua" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 6, name: "Enam" })).toBeInTheDocument();
  });

  it("paragraf menggabung baris berturut-turut", () => {
    tampil("Baris satu\nbaris dua.\n\nParagraf lain.");

    expect(akar().querySelectorAll("p")).toHaveLength(2);
    expect(akar().querySelector("p").textContent).toBe("Baris satu baris dua.");
  });

  it("daftar berbutir dan bernomor dibedakan", () => {
    tampil("- a\n- b\n\n1. x\n2. y");

    expect(akar().querySelectorAll("ul li")).toHaveLength(2);
    expect(akar().querySelectorAll("ol li")).toHaveLength(2);
  });

  it("blok kode tidak diurai isinya", () => {
    tampil("```dart\nvoid main() { **bukan tebal** }\n```");

    const pre = akar().querySelector("pre code");
    expect(pre.textContent).toBe("void main() { **bukan tebal** }");
    expect(pre.querySelector("strong")).toBeNull();
  });

  it("blok kode tanpa penutup tetap terurai sampai akhir", () => {
    tampil("```\nbaris satu\nbaris dua");

    expect(akar().querySelector("pre code").textContent).toBe("baris satu\nbaris dua");
  });

  it("kutipan dan garis pemisah dikenali", () => {
    tampil("> catatan penting\n\n---");

    expect(akar().querySelector("blockquote").textContent).toBe("catatan penting");
    expect(akar().querySelector("hr")).toBeInTheDocument();
  });

  it("tabel dengan baris pembatas jadi tabel sungguhan", () => {
    tampil("| a | b |\n|---|---|\n| 1 | 2 |");

    expect(akar().querySelectorAll("table th")).toHaveLength(2);
    expect(akar().querySelectorAll("table td")).toHaveLength(2);
  });

  // Tanpa baris pembatas itu bukan tabel -- jangan menebak-nebak.
  it("tanpa baris pembatas bukan tabel", () => {
    tampil("| a | b |\n| 1 | 2 |");

    expect(akar().querySelector("table")).toBeNull();
  });
});

describe("inline", () => {
  it("tebal, miring, dan kode sebaris", () => {
    tampil("**tebal** dan *miring* dan `kode`");

    expect(screen.getByText("tebal").tagName).toBe("STRONG");
    expect(screen.getByText("miring").tagName).toBe("EM");
    expect(screen.getByText("kode").tagName).toBe("CODE");
  });

  // Yang di dalam backtick harus utuh, termasuk tanda bintangnya.
  it("isi kode sebaris tidak ikut diurai", () => {
    tampil("pakai `**bukan tebal**` di sini");

    expect(screen.getByText("**bukan tebal**").tagName).toBe("CODE");
  });

  it("masukan kosong atau null tidak meledak", () => {
    expect(renderMarkdown("")).toEqual([]);
    expect(renderMarkdown(null)).toEqual([]);
    expect(renderMarkdown(undefined)).toEqual([]);
  });
});

describe("isMarkdown", () => {
  it("hanya berkas bertanda markdown", () => {
    expect(isMarkdown({ language: "markdown" })).toBe(true);
    expect(isMarkdown({ language: "dart" })).toBe(false);
    expect(isMarkdown(null)).toBe(false);
  });
});
