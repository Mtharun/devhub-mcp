import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { openDatabase } from "./db/database.js";
import { registerProjectTools } from "./mcp/projectTools.js";
import { registerTaskTools } from "./mcp/taskTools.js";


async function main() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const db = openDatabase(config.dbPath);

  const server = new McpServer({ name: "devhub-mcp", version: "0.1.0" });
  registerProjectTools(server, db);
  registerTaskTools(server, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`DevHub MCP server running. Database: ${config.dbPath}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});