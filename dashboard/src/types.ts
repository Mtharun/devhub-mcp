// These types mirror the JSON returned by the DevHub API (src/services/*.ts in the backend).

export type ProjectStatus = "planned" | "in_progress" | "on_hold" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high";
export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "archived";

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  techStack: string[];
  path: string | null;
  githubUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: number;
  company: string;
  role: string;
  status: ApplicationStatus;
  jobUrl: string | null;
  location: string | null;
  source: string | null;
  appliedDate: string | null;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  version: string;
  projects: Project[];
  pendingTasks: Task[];
  doneTasks: Task[];
  applications: Application[];
}
