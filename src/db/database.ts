import { DatabaseSync } from "node:sqlite";

// Each migration moves the database schema one version forward.
// The current version is stored inside the database file (PRAGMA user_version),
// so an existing database only runs the migrations it has not seen yet.
// Rule: never edit a migration that has shipped; add a new one instead.
const MIGRATIONS: string[] = [
  // Version 1: projects and tasks (IF NOT EXISTS keeps databases created before migrations safe)
  `
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned', 'in_progress', 'on_hold', 'completed', 'archived')),
    tech_stack  TEXT NOT NULL DEFAULT '[]',
    path        TEXT,
    github_url  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
    priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
    due_date    TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  ) STRICT;
  `,

  // Version 2: job applications
  `
  CREATE TABLE applications (
    id             INTEGER PRIMARY KEY,
    company        TEXT NOT NULL,
    role           TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'applied'
                   CHECK (status IN ('wishlist', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'archived')),
    job_url        TEXT,
    location       TEXT,
    source         TEXT,
    applied_date   TEXT,
    follow_up_date TEXT,
    notes          TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  ) STRICT;

  CREATE INDEX idx_applications_status ON applications (status);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

function migrate(db: DatabaseSync): void {
  const { user_version: currentVersion } = db
    .prepare("PRAGMA user_version")
    .get() as unknown as { user_version: number };

  if (currentVersion > SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than this app supports (${SCHEMA_VERSION}). Update DevHub.`
    );
  }

  for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version++) {
    // A transaction makes each migration all-or-nothing: a failure leaves the old schema intact.
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[version - 1]);
      db.exec(`PRAGMA user_version = ${version}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

export function openDatabase(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  // Claude Desktop and the web dashboard may open the same file; wait instead of failing when it is busy.
  db.exec("PRAGMA busy_timeout = 5000;");
  try {
    migrate(db);
  } catch (error) {
    db.close(); // release the file (Windows keeps open files locked)
    throw error;
  }
  return db;
}
