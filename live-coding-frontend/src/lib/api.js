import { API_URL } from "../config.js";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Tidak bisa terhubung ke server.", 0);
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || `Server error (${response.status}).`, response.status);
  return data;
}

const auth = (token) => (token ? { "x-student-token": token } : {});

export const studentApi = {
  register: (nim, name, password) =>
    request("/api/student/register", { method: "POST", body: { nim, name, password } }),
  login: (nim, password) => request("/api/student/login", { method: "POST", body: { nim, password } }),
  logout: (token) => request("/api/student/logout", { method: "POST", headers: auth(token) }),
  me: (token) => request("/api/student/me", { headers: auth(token) }),
  home: (token) => request("/api/student/home", { headers: auth(token) }),
  changePassword: (token, currentPassword, newPassword) =>
    request("/api/student/password", { method: "POST", headers: auth(token), body: { currentPassword, newPassword } }),
  joinCourse: (token, code) =>
    request("/api/student/courses", { method: "POST", headers: auth(token), body: { code } }),
  course: (token, slug) =>
    request(`/api/student/courses/${encodeURIComponent(slug)}`, { headers: auth(token) }),
  leaveCourse: (token, slug) =>
    request(`/api/student/courses/${encodeURIComponent(slug)}`, { method: "DELETE", headers: auth(token) }),
};

export function adminApi(token) {
  const call = (method, path, body) =>
    request(`/api/admin${path}`, { method, body, headers: { authorization: `Bearer ${token}` } });

  return {
    check: () => call("GET", "/check"),
    courses: () => call("GET", "/courses"),
    createCourse: (name) => call("POST", "/courses", { name }),
    updateCourse: (id, changes) => call("PATCH", `/courses/${id}`, changes),
    regenerateCode: (id) => call("POST", `/courses/${id}/regenerate-code`),
    deleteCourse: (id) => call("DELETE", `/courses/${id}`),
    meetings: (courseId) => call("GET", `/courses/${courseId}/meetings`),
    createMeeting: (courseId, data) => call("POST", `/courses/${courseId}/meetings`, data),
    updateMeeting: (id, changes) => call("PATCH", `/meetings/${id}`, changes),
    deleteMeeting: (id) => call("DELETE", `/meetings/${id}`),
    revokeStudents: (courseId) => call("DELETE", `/courses/${courseId}/students`),
    courseStudents: (courseId) => call("GET", `/courses/${courseId}/students`),
    resetStudentPassword: (nim) => call("POST", `/students/${encodeURIComponent(nim)}/reset-password`),
    meetingViewers: (id) => call("GET", `/meetings/${id}/viewers`),
  };
}

export function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
