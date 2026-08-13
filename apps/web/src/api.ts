export interface User { id: string; name: string; email: string }
export interface AuthPayload { user: User }
export interface Project { id: string; title: string; createdAt: string; status: "draft" | "in_progress" | "completed" | "failed"; artStyle?: string; styleState?: "idle" | "running" | "failed" | "completed"; styleError?: string }

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body.code || "REQUEST_FAILED", body.message || "Request failed.");
  return body;
}

export const api = {
  session: () => call<AuthPayload>("/api/auth"),
  login: (email: string, password: string) => call<AuthPayload>("/api/auth", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => call<AuthPayload>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  logout: () => call<void>("/api/auth", { method: "DELETE" }),
  projects: () => call<{ projects: Project[] }>("/api/projects"),
  project: (projectId: string) => call<{ project: Project }>(`/api/projects/${projectId}`),
  book: (projectId: string) => call<{ bookContent: string }>(`/api/projects/${projectId}/book`),
  saveArtStyle: (projectId: string, artStyle: string) => call<{ project: Project }>(`/api/projects/${projectId}/style`, { method: "PATCH", body: JSON.stringify({ artStyle }) }),
  generateArtStyle: (projectId: string) => call<{ project: Project }>(`/api/projects/${projectId}/style/generate`, { method: "POST" }),
  createProject: (title: string, bookContent: string) => call<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify({ title, bookContent }) }),
};
