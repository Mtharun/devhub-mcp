import fs from "node:fs";
import { config } from "./config.js";
import { openDatabase } from "./db/database.js";
import { createProject, listProjects } from "./services/projectService.js";

fs.mkdirSync(config.dataDir, { recursive: true });
const db = openDatabase(config.dbPath);

const created = createProject(db, {
  name: "devhub-mcp",
  description: "Personal developer assistant MCP server for projects and tasks",
  status: "in_progress",
  techStack: ["TypeScript", "Node.js", "MCP", "SQLite"],
  path: "D:\\devhub-mcp",
});

console.error("Created:", created);
console.error("All projects:", listProjects(db));

db.close();