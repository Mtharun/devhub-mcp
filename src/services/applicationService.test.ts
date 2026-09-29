import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../db/database.js";
import {
  archiveApplication,
  createApplication,
  listApplications,
  updateApplication,
} from "./applicationService.js";
import { todayLocal } from "../utils/dates.js";

let db: DatabaseSync;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("createApplication", () => {
  test("defaults to 'applied' with today's date", () => {
    const application = createApplication(db, { company: "Zoho", role: "Developer" });

    assert.equal(application.status, "applied");
    assert.equal(application.appliedDate, todayLocal());
    assert.equal(application.followUpDate, null);
  });

  test("leaves appliedDate empty for wishlist jobs", () => {
    const application = createApplication(db, { company: "Freshworks", role: "SDE", status: "wishlist" });

    assert.equal(application.appliedDate, null);
  });
});

describe("listApplications", () => {
  test("hides archived applications by default", () => {
    createApplication(db, { company: "A", role: "Dev" });
    const old = createApplication(db, { company: "B", role: "Dev" });
    archiveApplication(db, old.id);

    const companies = listApplications(db).map((application) => application.company);
    assert.deepEqual(companies, ["A"]);
    assert.equal(listApplications(db, { status: "archived" }).length, 1);
  });

  test("finds companies by case-insensitive partial name", () => {
    createApplication(db, { company: "Zoho Corporation", role: "Dev" });
    createApplication(db, { company: "TCS", role: "Dev" });

    const companies = listApplications(db, { company: "zoho" }).map((application) => application.company);
    assert.deepEqual(companies, ["Zoho Corporation"]);
  });

  test("treats % and _ in the company filter as plain characters", () => {
    createApplication(db, { company: "Acme", role: "Dev" });

    assert.equal(listApplications(db, { company: "%" }).length, 0);
  });

  test("followUpDue returns only active applications due today or earlier, soonest first", () => {
    createApplication(db, { company: "Later", role: "Dev", followUpDate: "2026-10-20" });
    createApplication(db, { company: "Due today", role: "Dev", followUpDate: "2026-10-01" });
    createApplication(db, { company: "Overdue", role: "Dev", followUpDate: "2026-09-25" });
    createApplication(db, { company: "No date", role: "Dev" });
    createApplication(db, { company: "Rejected", role: "Dev", status: "rejected", followUpDate: "2026-09-20" });

    const companies = listApplications(db, { followUpDue: true, today: "2026-10-01" }).map(
      (application) => application.company
    );
    assert.deepEqual(companies, ["Overdue", "Due today"]);
  });
});

describe("updateApplication", () => {
  test("changes only the provided fields", () => {
    const created = createApplication(db, { company: "Zoho", role: "Developer", notes: "Referral from Ravi" });

    const updated = updateApplication(db, created.id, { status: "interviewing" });

    assert.equal(updated.status, "interviewing");
    assert.equal(updated.notes, "Referral from Ravi");
    assert.equal(updated.company, "Zoho");
  });

  test("throws a friendly error for an unknown id", () => {
    assert.throws(() => updateApplication(db, 42, { status: "offer" }), {
      name: "DevHubError",
      message: /No job application with id 42/,
    });
  });

  test("throws when no changes are provided", () => {
    const created = createApplication(db, { company: "Zoho", role: "Developer" });

    assert.throws(() => updateApplication(db, created.id, {}), {
      name: "DevHubError",
      message: /No changes provided/,
    });
  });
});

describe("archiveApplication", () => {
  test("is idempotent", () => {
    const created = createApplication(db, { company: "Zoho", role: "Developer" });

    archiveApplication(db, created.id);
    assert.equal(archiveApplication(db, created.id).status, "archived");
  });
});
