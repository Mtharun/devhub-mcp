import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { openDatabase } from "../db/database.js";
import { createProject } from "../services/projectService.js";
import { createTask } from "../services/taskService.js";
import { createApplication } from "../services/applicationService.js";
import { createWebServer } from "./server.js";
import { VERSION } from "../version.js";

let server: http.Server;
let port: number;

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

  server = createWebServer(db);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port; // port 0 = "any free port", so tests never clash
});

after(() => {
  server.close();
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

  test("does not serve files outside the dashboard allow-list", async () => {
    const response = await request("/../package.json");

    assert.equal(response.status, 404);
  });

  test("serves the dashboard with security headers", async () => {
    const response = await request("/");

    assert.equal(response.status, 200);
    assert.match(response.body, /<title>DevHub Dashboard<\/title>/);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.match(String(response.headers["content-security-policy"]), /default-src 'self'/);
  });
});
