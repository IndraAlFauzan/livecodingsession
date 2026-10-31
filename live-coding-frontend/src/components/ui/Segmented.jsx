// Pemilih mode dua-tiga pilihan yang membagi lebar rata, untuk saat pilihannya
// setara dan harus terlihat semua -- misalnya Masuk/Daftar.
//
// Beda dari Tabs: Tabs memeluk isinya dan dipakai menyaring daftar (sering
// dengan jumlah di sebelah labelnya). Kalau Tabs dipaksa selebar induknya,
// labelnya menumpuk di kiri dan menyisakan ruang kosong.
export default function Segmented({ items, value = 0, onChange, label }) {
  return (
    <div className="lc-segmented" role="tablist" aria-label={label}>
      {(items || []).map((item, index) => (
        <button
          key={item.label}
          type="button"
          className="lc-segmented__item"
          role="tab"
          aria-selected={index === value}
          onClick={() => onChange?.(index)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
