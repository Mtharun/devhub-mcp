import type { DatabaseSync } from "node:sqlite";
import { DevHubError } from "../errors.js";

export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high";

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

export interface CreateTaskInput {
  projectName: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface ListTasksFilter {
  projectName?: string;
  status?: TaskStatus;
}

interface TaskRow {
  id: number;
  project_id: number;
  project_name: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_SELECT = `
  SELECT tasks.*, projects.name AS project_name
  FROM tasks
  JOIN projects ON projects.id = tasks.project_id
`;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findProjectId(db: DatabaseSync, projectName: string): number {
  const row = db
    .prepare("SELECT id FROM projects WHERE name = ?")
    .get(projectName) as unknown as { id: number } | undefined;

  if (!row) {
    throw new DevHubError(
      `No project named "${projectName}" was found. Use list_projects to see the available projects.`
    );
  }
  return row.id;
}

export function getTaskById(db: DatabaseSync, id: number): Task {
  const row = db
    .prepare(`${TASK_SELECT} WHERE tasks.id = ?`)
    .get(id) as unknown as TaskRow | undefined;

  if (!row) {
    throw new DevHubError(`No task with id ${id} was found. Use list_tasks to see task ids.`);
  }
  return toTask(row);
}

export function createTask(db: DatabaseSync, input: CreateTaskInput): Task {
  const projectId = findProjectId(db, input.projectName);
  const now = new Date().toISOString();

  const inserted = db
    .prepare(
      `INSERT INTO tasks
         (project_id, title, description, status, priority, due_date, created_at, updated_at)
       VALUES (?, ?, ?, 'todo', ?, ?, ?, ?)
       RETURNING id`
    )
    .get(
      projectId,
      input.title,
      input.description ?? null,
      input.priority ?? "medium",
      input.dueDate ?? null,
      now,
      now
    ) as unknown as { id: number };

  return getTaskById(db, inserted.id);
}

export function listTasks(db: DatabaseSync, filter: ListTasksFilter = {}): Task[] {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filter.projectName !== undefined) {
    findProjectId(db, filter.projectName);
    conditions.push("projects.name = ?");
    values.push(filter.projectName);
  }

  if (filter.status !== undefined) {
    conditions.push("tasks.status = ?");
    values.push(filter.status);
  } else {
    conditions.push("tasks.status IN ('todo', 'in_progress')");
  }

  const sql = `
    ${TASK_SELECT}
    WHERE ${conditions.join(" AND ")}
    ORDER BY
      CASE tasks.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      tasks.due_date IS NULL,
      tasks.due_date,
      tasks.created_at
  `;

  const rows = db.prepare(sql).all(...values) as unknown as TaskRow[];
  return rows.map(toTask);
}