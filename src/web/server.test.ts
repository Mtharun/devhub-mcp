import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { openDatabase } from "../db/database.js";
import { createProject } from "../services/projectService.js";
import { createTask } from "../services/taskService.js";
import { createApplication } from "../services/applicationService.js";
import { createWebServer } from "./server.js";
import { VERSION } from "../version.js";

let server: http.Server;
let port: number;
let staticDir: string;

// A small helper instead of fetch(), because fetch() does not let us fake the Host header
function request(
  path: string,
  options: { method?: string; host?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { port, path, method: options.method ?? "GET", headers: { host: options.host ?? `localhost:${port}` } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

before(async () => {
  const db = openDatabase(":memory:");
  createProject(db, { name: "alpha", techStack: ["React"] });
  createTask(db, { projectName: "alpha", title: "Ship it", priority: "high" });
  createApplication(db, { company: "Zoho", role: "Developer", followUpDate: "2000-01-01" });

  // A tiny fake "built dashboard" so these tests do not depend on running the React build
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-static-"));
  fs.mkdirSync(path.join(staticDir, "assets"));
  fs.writeFileSync(path.join(staticDir, "index.html"), "<!doctype html><title>DevHub</title>");
  fs.writeFileSync(path.join(staticDir, "assets", "index-abc123.js"), "console.log('hi')");
  fs.writeFileSync(path.join(staticDir, ".env"), "SECRET=1");

  server = createWebServer(db, { staticDir });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port; // port 0 = "any free port", so tests never clash
});

after(() => {
  server.close();
  fs.rmSync(staticDir, { recursive: true, force: true });
});

describe("web API", () => {
  test("GET /api/health returns the package version", async () => {
    const response = await request("/api/health");

    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), { ok: true, version: VERSION });
  });

  test("GET /api/projects, /api/tasks and /api/applications return data from the services", async () => {
    const projects = JSON.parse((await request("/api/projects")).body);
    const tasks = JSON.parse((await request("/api/tasks")).body);
    const applications = JSON.parse((await request("/api/applications?followUpDue=true")).body);

    assert.equal(projects[0].name, "alpha");
    assert.equal(tasks[0].title, "Ship it");
    assert.equal(applications[0].company, "Zoho");
  });

  test("GET /api/summary counts things", async () => {
    const summary = JSON.parse((await request("/api/summary")).body);

    assert.deepEqual(summary, { activeProjects: 1, pendingTasks: 1, activeApplications: 1, followUpsDue: 1 });
  });

  test("invalid query parameters return 400", async () => {
    const response = await request("/api/tasks?status=finished");

    assert.equal(response.status, 400);
  });

  test("an unknown project returns a 404 with the friendly message", async () => {
    const response = await request("/api/tasks?project=blog");

    assert.equal(response.status, 404);
    assert.match(JSON.parse(response.body).error, /No project named "blog"/);
  });
});

describe("web security", () => {
  test("rejects requests for other host names (DNS rebinding protection)", async () => {
    const response = await request("/api/projects", { host: "evil.example.com" });

    assert.equal(response.status, 403);
  });

  test("rejects anything other than GET", async () => {
    const response = await request("/api/projects", { method: "POST" });

    assert.equal(response.status, 405);
  });

  test("does not serve files outside the dashboard folder or hidden files", async () => {
    for (const attempt of ["/../package.json", "/%2e%2e/package.json", "/assets/..%2f..%2fpackage.json", "/.env"]) {
      const response = await request(attempt);
      assert.equal(response.status, 404, attempt);
    }
  });

  test("serves the dashboard with security headers", async () => {
    const response = await request("/");

    assert.equal(response.status, 200);
    assert.match(response.body, /<title>DevHub<\/title>/);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.match(String(response.headers["content-security-policy"]), /default-src 'self'/);
  });

  test("serves hashed assets with a long cache time", async () => {
    const response = await request("/assets/index-abc123.js");

    assert.equal(response.status, 200);
    assert.match(String(response.headers["content-type"]), /javascript/);
    assert.match(String(response.headers["cache-control"]), /immutable/);
  });
});

describe("web server without a built dashboard", () => {
  test("explains how to build it instead of failing", async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "devhub-empty-"));
    const other = createWebServer(openDatabase(":memory:"), { staticDir: emptyDir });
    await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
    const otherPort = (other.address() as AddressInfo).port;

    const body = await new Promise<string>((resolve, reject) => {
      http
        .get({ port: otherPort, path: "/", headers: { host: "localhost" } }, (res) => {
          let text = "";
          res.on("data", (chunk) => (text += chunk));
          res.on("end", () => resolve(text));
        })
        .on("error", reject);
    });

    other.close();
    fs.rmSync(emptyDir, { recursive: true, force: true });
    assert.match(body, /npm run build:dashboard/);
  });
});
