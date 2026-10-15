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

export const studentApi = {
  access: (code) => request("/api/student/access", { method: "POST", body: { code } }),
  course: (slug, code) =>
    request(`/api/student/courses/${encodeURIComponent(slug)}`, { headers: { "x-access-code": code } }),
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
  };
}

export function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export const STATUS_LABEL = { draft: "Belum dimulai", live: "Live", finished: "Selesai" };
