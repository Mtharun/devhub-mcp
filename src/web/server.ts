import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { DevHubError } from "../errors.js";
import { listProjects } from "../services/projectService.js";
import { listTasks } from "../services/taskService.js";
import { listApplications } from "../services/applicationService.js";
import { VERSION } from "../version.js";

// The React dashboard is built into dashboard/dist (npm run build:dashboard).
// build/web/server.js → ../../dashboard/dist is the project root's dashboard/dist folder.
export const DEFAULT_STATIC_DIR = fileURLToPath(new URL("../../dashboard/dist/", import.meta.url));

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// Every part of the URL path must be a plain file or folder name: letters, digits, ".", "_" or "-",
// not starting with a dot. So "..", "%2e%2e", hidden files and backslashes can never reach the disk.
const SAFE_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

function resolveStaticFile(staticDir: string, pathname: string): string | null {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const segments = relative.split("/");
  if (segments.length > 3 || !segments.every((segment) => SAFE_SEGMENT.test(segment))) return null;
  if (!CONTENT_TYPES[path.extname(relative).toLowerCase()]) return null;

  const fullPath = path.join(staticDir, ...segments);
  // Belt and braces: the final path must still be inside the static folder
  if (!fullPath.startsWith(path.resolve(staticDir) + path.sep)) return null;
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile() ? fullPath : null;
}

const NOT_BUILT_PAGE = `<!doctype html><meta charset="utf-8"><title>DevHub</title>
<body style="font-family:system-ui;padding:2rem;line-height:1.6">
<h1>The dashboard is not built yet</h1>
<p>Run <code>npm run build:dashboard</code> in the devhub-mcp folder, then refresh this page.</p>
<p>The JSON API is already available at <a href="/api/summary">/api/summary</a>.</p>`;

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

export interface WebServerOptions {
  staticDir?: string;
}

export function createWebServer(db: DatabaseSync, options: WebServerOptions = {}): http.Server {
  const staticDir = path.resolve(options.staticDir ?? DEFAULT_STATIC_DIR);

  return http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const hostname = (request.headers.host ?? "").replace(/:\d+$/, "");

    if (!ALLOWED_HOSTNAMES.has(hostname)) {
      sendJson(response, 403, { error: "Forbidden host." });
      return;
    }

    // The dashboard is read-only: every change still goes through Claude and the MCP tools
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

      const filePath = resolveStaticFile(staticDir, url.pathname);
      if (!filePath) {
        if (url.pathname === "/" && !fs.existsSync(path.join(staticDir, "index.html"))) {
          response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" });
          response.end(NOT_BUILT_PAGE);
          return;
        }
        sendJson(response, 404, { error: "Not found." });
        return;
      }

      // Hashed asset names (index-AbC123.js) never change content, so browsers may cache them
      const cache = url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()],
        "Cache-Control": cache,
      });
      response.end(fs.readFileSync(filePath));
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
