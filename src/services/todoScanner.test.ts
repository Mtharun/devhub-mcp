import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../db/database.js";
import { createProject } from "./projectService.js";
import { findTodos } from "./todoScanner.js";
import { readProjectReadme } from "./readmeService.js";

let db: DatabaseSync;
let workspace: string; // plays the role of D:\ (a parent folder)
let projectDir: string; // plays the role of D:\my-app

function write(relativePath: string, content: string): void {
  const fullPath = path.join(projectDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

beforeEach(() => {
  db = openDatabase(":memory:");
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-scan-"));
  projectDir = path.join(workspace, "my-app");
  fs.mkdirSync(projectDir);
  createProject(db, { name: "my-app", path: projectDir });
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe("findTodos", () => {
  test("finds TODO and FIXME comments with file and line number", () => {
    write("src/app.ts", "const a = 1;\n// TODO: add login\nconst b = 2; // FIXME handle null\n");
    write("README.md", "# App\n\n- TODO write docs\n");

    const result = findTodos(db, "my-app");

    assert.deepEqual(result.items, [
      { file: "README.md", line: 3, tag: "TODO", text: "write docs" },
      { file: "src/app.ts", line: 2, tag: "TODO", text: "add login" },
      { file: "src/app.ts", line: 3, tag: "FIXME", text: "handle null" },
    ]);
    assert.equal(result.truncated, false);
  });

  test("skips node_modules, build output, .env files and unknown file types", () => {
    write("node_modules/lib/index.js", "// TODO inside a dependency");
    write("build/index.js", "// TODO compiled copy");
    write(".env", "SECRET=abc # TODO rotate");
    write("photo.png", "TODO not really text");
    write("src/index.ts", "// TODO the only real one");

    const files = findTodos(db, "my-app").items.map((item) => item.file);

    assert.deepEqual(files, ["src/index.ts"]);
  });

  test("ignores lowercase words like 'todo list' to avoid noise", () => {
    write("src/list.ts", "// render the todo list\nconst todos = [];\n");

    assert.equal(findTodos(db, "my-app").items.length, 0);
  });

  test("only reports tags that start a comment, not TODO inside normal code or text", () => {
    write(
      "src/mixed.ts",
      [
        'const label = "TODO scanner";', // a string, not a comment
        "/* HACK: temporary workaround */",
        "# TODO(tharun): python-style comment",
        "  * FIXME inside a block comment",
        "<!-- XXX: html comment -->",
      ].join("\n")
    );
    write("notes.md", "The TODO scanner is great.\n- TODO real item\n");

    const found = findTodos(db, "my-app").items.map((item) => `${item.file}:${item.line} ${item.tag} ${item.text}`);

    assert.deepEqual(found, [
      "notes.md:2 TODO real item",
      "src/mixed.ts:2 HACK temporary workaround",
      "src/mixed.ts:3 TODO python-style comment",
      "src/mixed.ts:4 FIXME inside a block comment",
      "src/mixed.ts:5 XXX html comment",
    ]);
  });

  test("does not follow symlinks that point outside the project", (t) => {
    const outside = path.join(workspace, "secret-folder");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "notes.md"), "TODO private stuff");

    try {
      fs.symlinkSync(outside, path.join(projectDir, "link"), "junction");
    } catch {
      t.skip("creating symlinks is not permitted on this machine");
      return;
    }

    assert.equal(findTodos(db, "my-app").items.length, 0);
  });

  test("stops at maxResults and reports truncation", () => {
    write("src/many.ts", Array.from({ length: 10 }, (_, i) => `// TODO item ${i}`).join("\n"));

    const result = findTodos(db, "my-app", { maxResults: 3 });

    assert.equal(result.items.length, 3);
    assert.equal(result.truncated, true);
  });

  test("refuses folders outside DEVHUB_ALLOWED_ROOTS", () => {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-allowed-"));

    try {
      assert.throws(() => findTodos(db, "my-app", { allowedRoots: [elsewhere] }), {
        name: "DevHubError",
        message: /not allowed to read/,
      });
      // The parent folder of the project is allowed
      assert.doesNotThrow(() => findTodos(db, "my-app", { allowedRoots: [workspace] }));
    } finally {
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  test("gives a friendly error when the folder does not exist", () => {
    createProject(db, { name: "ghost", path: path.join(workspace, "does-not-exist") });

    assert.throws(() => findTodos(db, "ghost"), { name: "DevHubError", message: /does not exist/ });
  });
});

describe("readProjectReadme", () => {
  test("reads README.md from the project folder", () => {
    write("README.md", "# Hello");

    assert.equal(readProjectReadme(db, "my-app"), "# Hello");
  });

  test("respects DEVHUB_ALLOWED_ROOTS too", () => {
    write("README.md", "# Hello");
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-allowed-"));

    try {
      assert.throws(() => readProjectReadme(db, "my-app", { allowedRoots: [elsewhere] }), {
        name: "DevHubError",
        message: /not allowed to read/,
      });
    } finally {
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  test("explains when the project has no folder path", () => {
    createProject(db, { name: "no-path" });

    assert.throws(() => readProjectReadme(db, "no-path"), {
      name: "DevHubError",
      message: /has no local folder path/,
    });
  });
});
