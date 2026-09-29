import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { listProjects } from "../services/projectService.js";
import { readProjectReadme } from "../services/readmeService.js";
import { DevHubError } from "../errors.js";
import { errorResult } from "./results.js";

export function registerReadmeFeatures(server: McpServer, db: DatabaseSync): void {
  // Resource template: project://{name}/readme (user attaches it as context)
  server.registerResource(
    "project-readme",
    new ResourceTemplate("project://{name}/readme", {
      list: async () => ({
        resources: listProjects(db)
          .filter((project) => project.path !== null)
          .map((project) => ({
            uri: `project://${encodeURIComponent(project.name)}/readme`,
            name: `${project.name} README`,
            mimeType: "text/markdown",
          })),
      }),
    }),
    {
      title: "Project README",
      description: "The README.md file from a DevHub project's local folder",
      mimeType: "text/markdown",
    },
    async (uri, { name }) => {
      const projectName = decodeURIComponent(String(name));
      const content = readProjectReadme(db, projectName);
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: content }],
      };
    }
  );

  // Tool: read_project_readme (AI decides to read it)
  server.registerTool(
    "read_project_readme",
    {
      title: "Read Project README",
      description:
        "Read the README.md file from a DevHub project's local folder. " +
        "Use this when the user asks to read, explain, summarize or review a project's README or documentation, " +
        "or asks what is incomplete or missing in a project.",
      inputSchema: {
        projectName: z.string().trim().min(1).max(100).describe("Exact name of an existing project"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ projectName }) => {
      try {
        const content = readProjectReadme(db, projectName);
        return {
          content: [{ type: "text", text: `README.md of "${projectName}":\n\n${content}` }],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in read_project_readme:", error);
        return errorResult("An unexpected error occurred while reading the README.");
      }
    }
  );
}