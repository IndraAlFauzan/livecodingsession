function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Penyimpanan browser tidak tersedia (mode privat); data hanya bertahan selama halaman terbuka.
  }
}

export const storage = {
  getStudentName: () => read("lc.studentName", ""),
  setStudentName: (name) => write("lc.studentName", name),

  getCourses: () => read("lc.courses", {}),
  saveCourse(slug, name, code) {
    write("lc.courses", { ...read("lc.courses", {}), [slug]: { name, code } });
  },
  forgetCourse(slug) {
    const courses = read("lc.courses", {});
    delete courses[slug];
    write("lc.courses", courses);
  },

  getAdminToken: () => read("lc.adminToken", null),
  setAdminToken: (token) => write("lc.adminToken", token),
};

export function getCourseAccess(slug) {
  const course = storage.getCourses()[slug];
  const studentName = storage.getStudentName();
  if (!course || !studentName) return null;
  return { code: course.code, courseName: course.name, studentName };
}
