import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../db/database.js";
import { createProject } from "./projectService.js";
import { archiveTask, createTask, listTasks, updateTask } from "./taskService.js";

let db: DatabaseSync;

beforeEach(() => {
  db = openDatabase(":memory:");
  createProject(db, { name: "alpha" });
  createProject(db, { name: "beta" });
});

describe("createTask", () => {
  test("creates a todo task with medium priority by default", () => {
    const task = createTask(db, { projectName: "alpha", title: "Write docs" });

    assert.equal(task.status, "todo");
    assert.equal(task.priority, "medium");
    assert.equal(task.projectName, "alpha");
    assert.equal(task.dueDate, null);
  });

  test("rejects an unknown project with a friendly error", () => {
    assert.throws(() => createTask(db, { projectName: "ghost", title: "Boo" }), {
      name: "DevHubError",
      message: /No project named "ghost"/,
    });
  });
});

describe("listTasks", () => {
  test("sorts by priority, then due date, not by creation order", () => {
    // Created in a deliberately scrambled order
    createTask(db, { projectName: "alpha", title: "low task", priority: "low" });
    createTask(db, { projectName: "alpha", title: "high later", priority: "high", dueDate: "2026-10-10" });
    createTask(db, { projectName: "beta", title: "medium task" });
    createTask(db, { projectName: "beta", title: "high no date", priority: "high" });
    createTask(db, { projectName: "alpha", title: "high sooner", priority: "high", dueDate: "2026-10-01" });

    const titles = listTasks(db).map((task) => task.title);

    assert.deepEqual(titles, [
      "high sooner",
      "high later",
      "high no date",
      "medium task",
      "low task",
    ]);
  });

  test("shows only pending tasks by default", () => {
    const done = createTask(db, { projectName: "alpha", title: "finished" });
    const archived = createTask(db, { projectName: "alpha", title: "cancelled" });
    createTask(db, { projectName: "alpha", title: "still open" });

    updateTask(db, done.id, { status: "done" });
    archiveTask(db, archived.id);

    const titles = listTasks(db).map((task) => task.title);
    assert.deepEqual(titles, ["still open"]);
  });

  test("filters by project name", () => {
    createTask(db, { projectName: "alpha", title: "alpha task" });
    createTask(db, { projectName: "beta", title: "beta task" });

    const titles = listTasks(db, { projectName: "beta" }).map((task) => task.title);
    assert.deepEqual(titles, ["beta task"]);
  });

  test("rejects filtering by an unknown project instead of returning an empty list", () => {
    assert.throws(() => listTasks(db, { projectName: "blog" }), {
      name: "DevHubError",
      message: /No project named "blog"/,
    });
  });
});

describe("updateTask", () => {
  test("changes only the provided fields", () => {
    const task = createTask(db, { projectName: "alpha", title: "Original", priority: "low" });

    const updated = updateTask(db, task.id, { status: "done" });

    assert.equal(updated.status, "done");
    assert.equal(updated.title, "Original");
    assert.equal(updated.priority, "low");
  });

  test("throws a friendly error for an unknown task id", () => {
    assert.throws(() => updateTask(db, 999, { status: "done" }), {
      name: "DevHubError",
      message: /No task with id 999/,
    });
  });
});