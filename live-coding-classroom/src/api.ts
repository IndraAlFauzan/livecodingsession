import { getConfig, getHttpBaseUrl } from "./config";

export type Course = {
  id: number;
  name: string;
  slug: string;
  accessCode: string;
  codeActive: boolean;
  meetingCount: number;
};

export type Meeting = {
  id: string;
  number: number;
  title: string;
  status: "draft" | "live" | "finished";
  visible: boolean;
  continuesFrom: { id: string; number: number; title: string } | null;
  projectName: string | null;
  teacherConnected: boolean;
  startedAt: string | null;
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { teacherToken } = getConfig();
  let response: Response;
  try {
    response = await fetch(`${getHttpBaseUrl()}/api/admin${path}`, {
      method,
      headers: {
        authorization: `Bearer ${teacherToken}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Tidak bisa terhubung ke backend (${getHttpBaseUrl()}).`, 0);
  }

  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError("Teacher token salah. Periksa setting liveCoding.teacherToken.", 401);
    }
    throw new ApiError(data?.error || `Backend error (${response.status}).`, response.status);
  }
  return data as T;
}

export const api = {
  listCourses: () => request<{ courses: Course[] }>("GET", "/courses").then((r) => r.courses),
  createCourse: (name: string) => request<{ course: Course }>("POST", "/courses", { name }).then((r) => r.course),
  listMeetings: (courseId: number) =>
    request<{ meetings: Meeting[] }>("GET", `/courses/${courseId}/meetings`).then((r) => r.meetings),
  createMeeting: (courseId: number, title: string) =>
    request<{ meeting: Meeting }>("POST", `/courses/${courseId}/meetings`, title ? { title } : {}).then(
      (r) => r.meeting,
    ),
};
