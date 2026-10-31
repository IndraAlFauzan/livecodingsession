// Perender Markdown subset untuk README di panel kode.
//
// Mengembalikan elemen React, bukan string HTML. Itu keputusan keamanannya:
// tidak ada dangerouslySetInnerHTML di mana pun, jadi `<script>`,
// `<img onerror=...>`, atau HTML mentah apa pun di README hanya akan tampil
// sebagai teks. Isi README datang dari folder dosen -- termasuk repo yang dia
// clone entah dari mana -- sementara di halaman mahasiswa ada tanda sesi di
// localStorage. Membersihkan HTML setelah terbentuk lebih lemah daripada tidak
// pernah membentuknya.

const SKEMA_AMAN = /^(https?:|mailto:)/i;

// Tautan dengan skema lain (javascript:, data:) turun jadi teks biasa.
function tautanAman(href) {
  return typeof href === "string" && SKEMA_AMAN.test(href.trim()) ? href.trim() : null;
}

const INLINE = /(`[^`]+`)|(!\[[^\]]*\]\([^)]*\))|(\[[^\]]*\]\([^)]*\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)/;

// Memecah satu baris jadi potongan teks dan penekanan.
function inline(teks, kunci = "i") {
  const hasil = [];
  let sisa = String(teks ?? "");
  let n = 0;

  while (sisa) {
    const cocok = INLINE.exec(sisa);
    if (!cocok) {
      hasil.push(sisa);
      break;
    }
    if (cocok.index > 0) hasil.push(sisa.slice(0, cocok.index));

    const token = cocok[0];
    const k = `${kunci}-${n++}`;

    if (token.startsWith("`")) {
      hasil.push(<code key={k}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("![")) {
      // Gambar tidak pernah dimuat: backend hanya mengirim path aset, bukan
      // isinya, dan memuat URL luar membocorkan ke server lain.
      const alt = token.slice(2, token.indexOf("]"));
      hasil.push(
        <span className="lc-md__img" key={k}>
          {alt || "gambar"}
        </span>,
      );
    } else if (token.startsWith("[")) {
      const batas = token.indexOf("](");
      const label = token.slice(1, batas);
      const href = tautanAman(token.slice(batas + 2, -1));
      hasil.push(
        href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" key={k}>
            {label}
          </a>
        ) : (
          <span key={k}>{label}</span>
        ),
      );
    } else if (token.startsWith("**")) {
      hasil.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    } else {
      hasil.push(<em key={k}>{token.slice(1, -1)}</em>);
    }

    sisa = sisa.slice(cocok.index + token.length);
  }

  return hasil;
}

const JUDUL = /^(#{1,6})\s+(.*)$/;
const DAFTAR = /^\s*[-*+]\s+(.*)$/;
const NOMOR = /^\s*\d+[.)]\s+(.*)$/;
const PEMISAH = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const KUTIPAN = /^>\s?(.*)$/;
const PAGAR = /^\s*```\s*([A-Za-z0-9+#-]*)\s*$/;
const BARIS_TABEL = /^\s*\|(.+)\|\s*$/;
const PEMBATAS_TABEL = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

const selTabel = (baris) =>
  baris
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((s) => s.trim());

export function renderMarkdown(sumber) {
  const baris = String(sumber ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const keluar = [];
  let i = 0;
  let n = 0;
  const kunci = () => `b${n++}`;

  while (i < baris.length) {
    const b = baris[i];

    // Blok kode berpagar: isinya tidak diurai sama sekali.
    if (PAGAR.test(b)) {
      const isi = [];
      i += 1;
      while (i < baris.length && !PAGAR.test(baris[i])) {
        isi.push(baris[i]);
        i += 1;
      }
      i += 1;
      keluar.push(
        <pre className="lc-md__pre" key={kunci()}>
          <code>{isi.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (!b.trim()) {
      i += 1;
      continue;
    }

    if (PEMISAH.test(b)) {
      keluar.push(<hr className="lc-md__hr" key={kunci()} />);
      i += 1;
      continue;
    }

    const judul = JUDUL.exec(b);
    if (judul) {
      const tingkat = Math.min(judul[1].length, 6);
      const Tag = `h${tingkat}`;
      const k = kunci();
      keluar.push(
        <Tag className={`lc-md__h lc-md__h${tingkat}`} key={k}>
          {inline(judul[2], k)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    // Tabel gaya GFM: butuh baris pembatas tepat di bawah kepalanya.
    if (BARIS_TABEL.test(b) && i + 1 < baris.length && PEMBATAS_TABEL.test(baris[i + 1])) {
      const kepala = selTabel(b);
      i += 2;
      const isi = [];
      while (i < baris.length && BARIS_TABEL.test(baris[i])) {
        isi.push(selTabel(baris[i]));
        i += 1;
      }
      const k = kunci();
      keluar.push(
        <div className="lc-md__tablewrap" key={k}>
          <table className="lc-md__table">
            <thead>
              <tr>
                {kepala.map((sel, x) => (
                  <th key={x}>{inline(sel, `${k}-h${x}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isi.map((kolom, y) => (
                <tr key={y}>
                  {kolom.map((sel, x) => (
                    <td key={x}>{inline(sel, `${k}-${y}-${x}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (KUTIPAN.test(b)) {
      const isi = [];
      while (i < baris.length && KUTIPAN.test(baris[i])) {
        isi.push(KUTIPAN.exec(baris[i])[1]);
        i += 1;
      }
      const k = kunci();
      keluar.push(
        <blockquote className="lc-md__quote" key={k}>
          {inline(isi.join(" "), k)}
        </blockquote>,
      );
      continue;
    }

    const berurut = NOMOR.test(b);
    if (DAFTAR.test(b) || berurut) {
      const pola = berurut ? NOMOR : DAFTAR;
      const butir = [];
      while (i < baris.length && pola.test(baris[i])) {
        butir.push(pola.exec(baris[i])[1]);
        i += 1;
      }
      const k = kunci();
      const Tag = berurut ? "ol" : "ul";
      keluar.push(
        <Tag className="lc-md__list" key={k}>
          {butir.map((isi, x) => (
            <li key={x}>{inline(isi, `${k}-${x}`)}</li>
          ))}
        </Tag>,
      );
      continue;
    }

    // Paragraf: baris berturut-turut sampai baris kosong atau blok lain.
    const isi = [];
    while (
      i < baris.length &&
      baris[i].trim() &&
      !JUDUL.test(baris[i]) &&
      !DAFTAR.test(baris[i]) &&
      !NOMOR.test(baris[i]) &&
      !KUTIPAN.test(baris[i]) &&
      !PAGAR.test(baris[i]) &&
      !PEMISAH.test(baris[i])
    ) {
      isi.push(baris[i].trim());
      i += 1;
    }
    const k = kunci();
    keluar.push(
      <p className="lc-md__p" key={k}>
        {inline(isi.join(" "), k)}
      </p>,
    );
  }

  return keluar;
}

export function isMarkdown(file) {
  return file?.language === "markdown";
}
