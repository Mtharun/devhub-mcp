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

export interface UpdateProjectInput {
  description?: string;
  status?: ProjectStatus;
  techStack?: string[];
  path?: string;
  githubUrl?: string;
}

export function updateProject(db: DatabaseSync, name: string, changes: UpdateProjectInput): Project {
  const setClauses: string[] = [];
  const values: string[] = [];

  if (changes.description !== undefined) {
    setClauses.push("description = ?");
    values.push(changes.description);
  }
  if (changes.status !== undefined) {
    setClauses.push("status = ?");
    values.push(changes.status);
  }
  if (changes.techStack !== undefined) {
    setClauses.push("tech_stack = ?");
    values.push(JSON.stringify(changes.techStack));
  }
  if (changes.path !== undefined) {
    setClauses.push("path = ?");
    values.push(changes.path);
  }
  if (changes.githubUrl !== undefined) {
    setClauses.push("github_url = ?");
    values.push(changes.githubUrl);
  }

  if (setClauses.length === 0) {
    throw new DevHubError("No changes provided. Specify at least one field to update.");
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());

  const row = db
    .prepare(`UPDATE projects SET ${setClauses.join(", ")} WHERE name = ? RETURNING *`)
    .get(...values, name) as unknown as ProjectRow | undefined;

  if (!row) {
    throw new DevHubError(
      `No project named "${name}" was found. Use list_projects to see the available projects.`
    );
  }

  return toProject(row);
}
export function archiveProject(db: DatabaseSync, name: string): Project {
  const existing = db
    .prepare("SELECT * FROM projects WHERE name = ?")
    .get(name) as unknown as ProjectRow | undefined;

  if (!existing) {
    throw new DevHubError(
      `No project named "${name}" was found. Use list_projects to see the available projects.`
    );
  }

  if (existing.status === "archived") {
    return toProject(existing);
  }

  const row = db
    .prepare("UPDATE projects SET status = 'archived', updated_at = ? WHERE name = ? RETURNING *")
    .get(new Date().toISOString(), name) as unknown as ProjectRow;

  return toProject(row);
}