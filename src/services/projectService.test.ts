import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../db/database.js";
import {
  archiveProject,
  createProject,
  listProjects,
  updateProject,
} from "./projectService.js";

let db: DatabaseSync;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("createProject", () => {
  test("creates a project with default values", () => {
    const project = createProject(db, { name: "demo" });

    assert.equal(project.id, 1);
    assert.equal(project.name, "demo");
    assert.equal(project.status, "planned");
    assert.deepEqual(project.techStack, []);
    assert.equal(project.githubUrl, null);
  });

  test("stores the tech stack as a real array", () => {
    const project = createProject(db, { name: "demo", techStack: ["React", "Vite"] });

    assert.deepEqual(project.techStack, ["React", "Vite"]);
  });

  test("rejects a duplicate name with a friendly error", () => {
    createProject(db, { name: "demo" });

    assert.throws(() => createProject(db, { name: "demo" }), {
      name: "DevHubError",
      message: /already exists/,
    });
  });
});

describe("listProjects", () => {
  test("hides archived projects unless includeArchived is true", () => {
    createProject(db, { name: "active-one" });
    createProject(db, { name: "old-one" });
    archiveProject(db, "old-one");

    const visible = listProjects(db).map((project) => project.name);
    assert.deepEqual(visible, ["active-one"]);

    assert.equal(listProjects(db, true).length, 2);
  });
});

describe("updateProject", () => {
  test("changes only the provided fields", () => {
    createProject(db, { name: "demo", techStack: ["React"], description: "original" });

    const updated = updateProject(db, "demo", { status: "in_progress" });

    assert.equal(updated.status, "in_progress");
    assert.equal(updated.description, "original");
    assert.deepEqual(updated.techStack, ["React"]);
  });

  test("throws a friendly error for an unknown project", () => {
    assert.throws(() => updateProject(db, "missing", { status: "completed" }), {
      name: "DevHubError",
      message: /No project named "missing"/,
    });
  });

  test("throws when no changes are provided", () => {
    createProject(db, { name: "demo" });

    assert.throws(() => updateProject(db, "demo", {}), {
      name: "DevHubError",
      message: /No changes provided/,
    });
  });
});

describe("archiveProject", () => {
  test("is idempotent: archiving twice keeps it archived", () => {
    createProject(db, { name: "demo" });

    archiveProject(db, "demo");
    const again = archiveProject(db, "demo");

    assert.equal(again.status, "archived");
  });
});