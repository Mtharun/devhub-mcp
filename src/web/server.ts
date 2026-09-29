import fs from "node:fs";
import http from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { DevHubError } from "../errors.js";
import { listProjects } from "../services/projectService.js";
import { listTasks } from "../services/taskService.js";
import { listApplications } from "../services/applicationService.js";
import { VERSION } from "../version.js";

// The dashboard files, read from the project's public/ folder.
// Only these exact paths are served: no part of the URL ever becomes a file path (no path traversal).
const STATIC_FILES: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
};
const PUBLIC_DIR = new URL("../../public/", import.meta.url);

// Only these host names may call the server. This blocks "DNS rebinding", where a malicious
// website points its own domain at 127.0.0.1 to read local servers from your browser.
const ALLOWED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
};

const tasksQuery = z.object({
  project: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
});

const applicationsQuery = z.object({
  status: z.enum(["wishlist", "applied", "interviewing", "offer", "rejected", "withdrawn", "archived"]).optional(),
  followUpDue: z.enum(["true", "false"]).optional(),
});

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function handleApi(db: DatabaseSync, pathname: string, query: Record<string, string>): unknown {
  switch (pathname) {
    case "/api/health":
      return { ok: true, version: VERSION };

    case "/api/projects":
      return listProjects(db, query.includeArchived === "true");

    case "/api/tasks": {
      const filter = tasksQuery.parse(query);
      return listTasks(db, { projectName: filter.project, status: filter.status });
    }

    case "/api/applications": {
      const filter = applicationsQuery.parse(query);
      return listApplications(db, { status: filter.status, followUpDue: filter.followUpDue === "true" });
    }

    case "/api/summary":
      return {
        activeProjects: listProjects(db).length,
        pendingTasks: listTasks(db).length,
        activeApplications: listApplications(db).filter((a) => !["rejected", "withdrawn"].includes(a.status)).length,
        followUpsDue: listApplications(db, { followUpDue: true }).length,
      };

    default:
      return undefined;
  }
}

export function createWebServer(db: DatabaseSync): http.Server {
  return http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const hostname = (request.headers.host ?? "").replace(/:\d+$/, "");

    if (!ALLOWED_HOSTNAMES.has(hostname)) {
      sendJson(response, 403, { error: "Forbidden host." });
      return;
    }

    // The dashboard is read-only in v0.3: every change still goes through Claude and the MCP tools
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      sendJson(response, 405, { error: "Only GET requests are supported." });
      return;
    }

    try {
      if (url.pathname.startsWith("/api/")) {
        const data = handleApi(db, url.pathname, Object.fromEntries(url.searchParams));
        if (data === undefined) {
          sendJson(response, 404, { error: "Unknown API endpoint." });
        } else {
          sendJson(response, 200, data);
        }
        return;
      }

      // Browsers ask for an icon automatically; answer "no content" instead of a noisy 404
      if (url.pathname === "/favicon.ico") {
        response.writeHead(204, SECURITY_HEADERS);
        response.end();
        return;
      }

      const staticFile = STATIC_FILES[url.pathname];
      if (!staticFile) {
        sendJson(response, 404, { error: "Not found." });
        return;
      }

      const content = fs.readFileSync(new URL(staticFile.file, PUBLIC_DIR));
      response.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": staticFile.type });
      response.end(content);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendJson(response, 400, { error: "Invalid query parameters.", details: error.issues.map((i) => i.message) });
      } else if (error instanceof DevHubError) {
        sendJson(response, 404, { error: error.message });
      } else {
        console.error("Unexpected web error:", error);
        sendJson(response, 500, { error: "Unexpected server error." });
      }
    }
  });
}
