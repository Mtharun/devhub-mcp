import type { DatabaseSync } from "node:sqlite";
import { DevHubError } from "../errors.js";
import { todayLocal } from "../utils/dates.js";

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "archived";

// Statuses where the application is still "alive" and may need action
export const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = ["wishlist", "applied", "interviewing", "offer"];

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

export interface CreateApplicationInput {
  company: string;
  role: string;
  status?: Exclude<ApplicationStatus, "archived">;
  jobUrl?: string;
  location?: string;
  source?: string;
  appliedDate?: string;
  followUpDate?: string;
  notes?: string;
}

export type UpdateApplicationInput = Partial<Omit<CreateApplicationInput, "company" | "role">> & {
  company?: string;
  role?: string;
};

export interface ListApplicationsFilter {
  status?: ApplicationStatus;
  company?: string;
  followUpDue?: boolean;
  today?: string;
}

interface ApplicationRow {
  id: number;
  company: string;
  role: string;
  status: ApplicationStatus;
  job_url: string | null;
  location: string | null;
  source: string | null;
  applied_date: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status,
    jobUrl: row.job_url,
    location: row.location,
    source: row.source,
    appliedDate: row.applied_date,
    followUpDate: row.follow_up_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getApplicationById(db: DatabaseSync, id: number): Application {
  const row = db
    .prepare("SELECT * FROM applications WHERE id = ?")
    .get(id) as unknown as ApplicationRow | undefined;

  if (!row) {
    throw new DevHubError(
      `No job application with id ${id} was found. Use list_applications to see application ids.`
    );
  }
  return toApplication(row);
}

export function createApplication(db: DatabaseSync, input: CreateApplicationInput): Application {
  const now = new Date().toISOString();
  const status = input.status ?? "applied";
  // If the user says "I applied", today's date is the sensible default
  const appliedDate = input.appliedDate ?? (status === "wishlist" ? null : todayLocal());

  const row = db
    .prepare(
      `INSERT INTO applications
         (company, role, status, job_url, location, source, applied_date, follow_up_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .get(
      input.company,
      input.role,
      status,
      input.jobUrl ?? null,
      input.location ?? null,
      input.source ?? null,
      appliedDate,
      input.followUpDate ?? null,
      input.notes ?? null,
      now,
      now
    ) as unknown as ApplicationRow;

  return toApplication(row);
}

export function listApplications(db: DatabaseSync, filter: ListApplicationsFilter = {}): Application[] {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filter.status !== undefined) {
    conditions.push("status = ?");
    values.push(filter.status);
  } else {
    conditions.push("status != 'archived'");
  }

  if (filter.company !== undefined) {
    // Case-insensitive partial match: "zoho" finds "Zoho Corporation"
    conditions.push("company LIKE ? ESCAPE '\\'");
    values.push(`%${filter.company.replace(/[\\%_]/g, (char) => `\\${char}`)}%`);
  }

  if (filter.followUpDue) {
    const placeholders = ACTIVE_APPLICATION_STATUSES.map(() => "?").join(", ");
    conditions.push(`follow_up_date IS NOT NULL AND follow_up_date <= ? AND status IN (${placeholders})`);
    values.push(filter.today ?? todayLocal(), ...ACTIVE_APPLICATION_STATUSES);
  }

  const sql = `
    SELECT * FROM applications
    WHERE ${conditions.join(" AND ")}
    ORDER BY
      follow_up_date IS NULL,
      follow_up_date,
      updated_at DESC
  `;

  const rows = db.prepare(sql).all(...values) as unknown as ApplicationRow[];
  return rows.map(toApplication);
}

const UPDATABLE_COLUMNS: Record<keyof UpdateApplicationInput, string> = {
  company: "company",
  role: "role",
  status: "status",
  jobUrl: "job_url",
  location: "location",
  source: "source",
  appliedDate: "applied_date",
  followUpDate: "follow_up_date",
  notes: "notes",
};

export function updateApplication(db: DatabaseSync, id: number, changes: UpdateApplicationInput): Application {
  const setClauses: string[] = [];
  const values: string[] = [];

  // Column names come from our fixed map above, never from user input (SQL injection safe)
  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = changes[field as keyof UpdateApplicationInput];
    if (value !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) {
    throw new DevHubError("No changes provided. Specify at least one field to update.");
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());

  const row = db
    .prepare(`UPDATE applications SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`)
    .get(...values, id) as unknown as ApplicationRow | undefined;

  if (!row) {
    throw new DevHubError(
      `No job application with id ${id} was found. Use list_applications to see application ids.`
    );
  }
  return toApplication(row);
}

export function archiveApplication(db: DatabaseSync, id: number): Application {
  const existing = getApplicationById(db, id);
  if (existing.status === "archived") {
    return existing;
  }

  db.prepare("UPDATE applications SET status = 'archived', updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    id
  );
  return getApplicationById(db, id);
}
