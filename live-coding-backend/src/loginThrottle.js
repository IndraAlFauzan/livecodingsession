const JENDELA_MS = 10 * 60 * 1000;
const BATAS = 10;

// Catatan kegagalan per NIM, di memori. Hilang saat server restart, dan itu
// dapat diterima: tujuannya memperlambat tebakan beruntun, bukan jadi catatan
// permanen.
const gagal = new Map();

function bersihkan(sekarang) {
  for (const [kunci, entri] of gagal) {
    if (sekarang - entri.pertama > JENDELA_MS) gagal.delete(kunci);
  }
}

// Dikunci per NIM, bukan per alamat IP: satu kelas biasanya keluar lewat satu
// NAT kampus, jadi pembatasan per IP akan mengunci seisi kelas sekaligus.
// Konsekuensinya, orang yang tahu NIM teman bisa menghalanginya masuk selama
// jendela ini -- karena itu jendelanya pendek dan hitungannya hangus begitu
// kata sandi yang benar masuk.
function sisaKuncian(nim) {
  const entri = gagal.get(nim);
  if (!entri) return 0;

  const sekarang = Date.now();
  if (sekarang - entri.pertama > JENDELA_MS) {
    gagal.delete(nim);
    return 0;
  }
  if (entri.jumlah < BATAS) return 0;
  return JENDELA_MS - (sekarang - entri.pertama);
}

function catatGagal(nim) {
  const sekarang = Date.now();
  bersihkan(sekarang);

  const entri = gagal.get(nim);
  if (!entri || sekarang - entri.pertama > JENDELA_MS) {
    gagal.set(nim, { pertama: sekarang, jumlah: 1 });
    return;
  }
  entri.jumlah += 1;
}

function hapusCatatan(nim) {
  gagal.delete(nim);
}

module.exports = { sisaKuncian, catatGagal, hapusCatatan, JENDELA_MS, BATAS };
