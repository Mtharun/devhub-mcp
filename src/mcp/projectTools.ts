import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { listProjects } from "../services/projectService.js";

export function registerProjectTools(server: McpServer, db: DatabaseSync): void {
  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description:
        "List the user's software projects with status, description, tech stack, local folder path and GitHub URL. " +
        "Use this when the user asks about their projects, what they are working on, or a project's status or technologies. " +
        "Archived projects are hidden unless includeArchived is true.",
      inputSchema: {
        includeArchived: z
          .boolean()
          .optional()
          .describe("Set to true to also include archived projects. Defaults to false."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ includeArchived }) => {
      const projects = listProjects(db, includeArchived ?? false);

      if (projects.length === 0) {
        return {
          content: [{ type: "text", text: "No projects found. The user has not added any projects yet." }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
      };
    }
  );
}