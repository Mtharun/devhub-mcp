import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { DEFAULT_MAX_RESULTS, findTodos } from "../services/todoScanner.js";
import type { FolderAccessOptions } from "../services/projectFolder.js";
import { DevHubError } from "../errors.js";
import { errorResult } from "./results.js";

export function registerTodoTools(server: McpServer, db: DatabaseSync, options: FolderAccessOptions): void {
  server.registerTool(
    "find_todos",
    {
      title: "Find TODOs",
      description:
        "Scan a DevHub project's local folder for TODO, FIXME, HACK, XXX and BUG comments in source files. " +
        "Returns file, line number, tag and text for each one. " +
        "Skips node_modules, .git, build output, symlinks, .env files and large files. " +
        "Use this when the user asks about TODOs, FIXMEs, unfinished code or leftover work in a project. " +
        "You can offer to turn important TODOs into tasks with create_task.",
      inputSchema: {
        projectName: z.string().trim().min(1).max(100).describe("Exact name of an existing project"),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe(`Maximum number of TODOs to return. Defaults to ${DEFAULT_MAX_RESULTS}.`),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ projectName, maxResults }) => {
      try {
        const result = findTodos(db, projectName, { ...options, maxResults });

        if (result.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No TODO comments found in "${result.projectName}" (${result.filesScanned} files scanned).`,
              },
            ],
          };
        }

        const lines = result.items.map((item) => `${item.file}:${item.line} [${item.tag}] ${item.text}`);
        const note = result.truncated ? "\n\n(Results were truncated; ask for more with a higher maxResults.)" : "";

        return {
          content: [
            {
              type: "text",
              text:
                `Found ${result.items.length} TODO comments in "${result.projectName}" ` +
                `(${result.filesScanned} files scanned):\n${lines.join("\n")}${note}`,
            },
          ],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in find_todos:", error);
        return errorResult("An unexpected error occurred while scanning for TODOs.");
      }
    }
  );
}
