// Lambang institusi. Hanya di layar pintu masuk dan beranda, bukan di halaman kerja.
const MARKS = [
  { src: "/logo-telkom-university.png", alt: "Telkom University", className: "lc-marks__telu" },
  { src: "/logo-fakultas-informatika.png", alt: "Fakultas Informatika, School of Computing", className: "lc-marks__fif" },
  {
    src: "/logo-s1-rekayasa-perangkat-lunak.png",
    alt: "S1 Rekayasa Perangkat Lunak",
    // Berkas aslinya monokrom putih; dibalik supaya terbaca di atas kanvas terang.
    className: "lc-marks__prodi",
  },
];

export default function InstitutionMarks({ className }) {
  return (
    <div className={["lc-marks", className].filter(Boolean).join(" ")}>
      {MARKS.map((mark) => (
        <img key={mark.src} className={mark.className} src={mark.src} alt={mark.alt} loading="lazy" />
      ))}
    </div>
  );
}
