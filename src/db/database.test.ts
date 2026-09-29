import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDatabase, SCHEMA_VERSION } from "./database.js";

function tableNames(db: DatabaseSync): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as unknown as { name: string }[];
  return rows.map((row) => row.name);
}

function userVersion(db: DatabaseSync): number {
  return (db.prepare("PRAGMA user_version").get() as unknown as { user_version: number }).user_version;
}

describe("openDatabase migrations", () => {
  test("creates every table on a fresh database and records the schema version", () => {
    const db = openDatabase(":memory:");

    assert.deepEqual(tableNames(db), ["applications", "projects", "tasks"]);
    assert.equal(userVersion(db), SCHEMA_VERSION);
  });

  test("upgrades a v0.2 database without losing existing data", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-migrate-"));
    const dbPath = path.join(dir, "devhub.db");

    // Simulate a database created by v0.2: tables exist but user_version is still 0
    const oldDb = new DatabaseSync(dbPath);
    oldDb.exec(`
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT,
        status TEXT NOT NULL DEFAULT 'planned', tech_stack TEXT NOT NULL DEFAULT '[]',
        path TEXT, github_url TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      ) STRICT;
      INSERT INTO projects (name, created_at, updated_at) VALUES ('devhub-mcp', 'x', 'x');
    `);
    oldDb.close();

    const db = openDatabase(dbPath);
    const names = (db.prepare("SELECT name FROM projects").all() as unknown as { name: string }[]).map(
      (row) => row.name
    );

    assert.deepEqual(names, ["devhub-mcp"]);
    assert.ok(tableNames(db).includes("applications"));
    assert.equal(userVersion(db), SCHEMA_VERSION);

    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("is safe to open the same database twice (migrations run only once)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-reopen-"));
    const dbPath = path.join(dir, "devhub.db");

    openDatabase(dbPath).close();
    const db = openDatabase(dbPath);

    assert.equal(userVersion(db), SCHEMA_VERSION);
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("refuses to open a database from a newer version of the app", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-newer-"));
    const dbPath = path.join(dir, "devhub.db");

    const future = new DatabaseSync(dbPath);
    future.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    future.close();

    assert.throws(() => openDatabase(dbPath), /newer than this app supports/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
