import type { Application, DashboardData, Project, Task } from "./types";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request to ${path} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

// One call that loads everything the dashboard needs, in parallel
export async function loadDashboard(): Promise<DashboardData> {
  const [health, projects, pendingTasks, doneTasks, applications] = await Promise.all([
    getJson<{ version: string }>("/api/health"),
    getJson<Project[]>("/api/projects"),
    getJson<Task[]>("/api/tasks"),
    getJson<Task[]>("/api/tasks?status=done"),
    getJson<Application[]>("/api/applications"),
  ]);
  return { version: health.version, projects, pendingTasks, doneTasks, applications };
}
