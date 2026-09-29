import type { DatabaseSync } from "node:sqlite";
import { DevHubError } from "../errors.js";

export type ProjectStatus =
  | "planned"
  | "in_progress"
  | "on_hold"
  | "completed"
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

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  techStack?: string[];
  path?: string;
  githubUrl?: string;
}

interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  tech_stack: string;
  path: string | null;
  github_url: string | null;
  created_at: string;
  updated_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    techStack: JSON.parse(row.tech_stack),
    path: row.path,
    githubUrl: row.github_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SQLITE_CONSTRAINT_UNIQUE = 2067;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "errcode" in error &&
    error.errcode === SQLITE_CONSTRAINT_UNIQUE
  );
}

export function createProject(db: DatabaseSync, input: CreateProjectInput): Project {
  const now = new Date().toISOString();

  try {
    const row = db
      .prepare(
        `INSERT INTO projects
           (name, description, status, tech_stack, path, github_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .get(
        input.name,
        input.description ?? null,
        input.status ?? "planned",
        JSON.stringify(input.techStack ?? []),
        input.path ?? null,
        input.githubUrl ?? null,
        now,
        now
      ) as unknown as ProjectRow;

    return toProject(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DevHubError(
        `A project named "${input.name}" already exists. Use a different name or update the existing project.`
      );
    }
    throw error;
  }
}

export function listProjects(db: DatabaseSync, includeArchived = false): Project[] {
  const sql = includeArchived
    ? "SELECT * FROM projects ORDER BY updated_at DESC"
    : "SELECT * FROM projects WHERE status != 'archived' ORDER BY updated_at DESC";

  const rows = db.prepare(sql).all() as unknown as ProjectRow[];
  return rows.map(toProject);
}