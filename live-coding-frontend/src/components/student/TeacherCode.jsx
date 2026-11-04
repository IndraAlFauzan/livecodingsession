// Kode dosen di samping nama mata kuliah. Kelas paralel sering bernama persis
// sama -- "Pemrograman Mobile" bisa ada tiga -- dan hanya kode dosennya yang
// membedakan. Nama lengkapnya ditaruh di tooltip supaya barisnya tetap pendek.
export default function TeacherCode({ teacher, className }) {
  if (!teacher?.code) return null;

  return (
    <span className={["lc-kodedosen", className].filter(Boolean).join(" ")} title={teacher.name || undefined}>
      {teacher.code}
    </span>
  );
}
