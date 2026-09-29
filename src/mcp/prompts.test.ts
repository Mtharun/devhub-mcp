import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../db/database.js";
import { createProject } from "../services/projectService.js";
import { createTask } from "../services/taskService.js";
import { createApplication } from "../services/applicationService.js";
import { buildPlanMyDayText } from "./prompts.js";

let db: DatabaseSync;

beforeEach(() => {
  db = openDatabase(":memory:");
  createProject(db, { name: "alpha" });
});

describe("buildPlanMyDayText", () => {
  test("includes the date, hours and pending tasks", () => {
    createTask(db, { projectName: "alpha", title: "Ship login", priority: "high" });

    const text = buildPlanMyDayText(db, "3", "2026-10-01");

    assert.match(text, /Today is 2026-10-01\. I have about 3 hours/);
    assert.match(text, /#1 \[high\] Ship login/);
    assert.match(text, /up to 3 things/);
  });

  test("says so when there are no pending tasks", () => {
    assert.match(buildPlanMyDayText(db, undefined, "2026-10-01"), /No pending tasks\./);
  });

  test("adds due job follow-ups only when there are any", () => {
    assert.doesNotMatch(buildPlanMyDayText(db, undefined, "2026-10-01"), /follow-ups that are due/);

    createApplication(db, { company: "Zoho", role: "Developer", followUpDate: "2026-09-30" });

    assert.match(buildPlanMyDayText(db, undefined, "2026-10-01"), /Developer at Zoho/);
  });
});
