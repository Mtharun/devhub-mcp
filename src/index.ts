import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { openDatabase } from "./db/database.js";
import { registerProjectTools } from "./mcp/projectTools.js";
import { registerTaskTools } from "./mcp/taskTools.js";
import { registerReadmeFeatures } from "./mcp/readmeFeatures.js";
import { registerPrompts } from "./mcp/prompts.js";
import { registerApplicationTools } from "./mcp/applicationTools.js";
import { registerTodoTools } from "./mcp/todoTools.js";
import { VERSION } from "./version.js";

async function main() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const db = openDatabase(config.dbPath);

  const server = new McpServer({ name: "devhub-mcp", version: VERSION });
  registerProjectTools(server, db);
  registerTaskTools(server, db);
  const folderAccess = { allowedRoots: config.allowedRoots };
  registerReadmeFeatures(server, db, folderAccess);
  registerTodoTools(server, db, folderAccess);
  registerApplicationTools(server, db);
  registerPrompts(server, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`DevHub MCP server v${VERSION} running. Database: ${config.dbPath}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});