import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  archiveProject,
  createProject,
  listProjects,
  updateProject,
} from "../services/projectService.js";
import { DevHubError } from "../errors.js";
import { errorResult } from "./results.js";


export function registerProjectTools(server: McpServer, db: DatabaseSync): void {
  // Tool 1: list_projects (read-only)
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

  // Tool 2: create_project (write)
  server.registerTool(
    "create_project",
    {
      title: "Create Project",
      description:
        "Create a new software project in the user's DevHub. " +
        "Use this when the user wants to add, start or track a new project. " +
        "Project names must be unique. Status defaults to 'planned'.",
      inputSchema: {
        name: z.string().trim().min(1).max(100).describe("Unique project name, e.g. 'portfolio-website'"),
        description: z.string().trim().max(500).optional().describe("Short description of the project"),
        status: z
          .enum(["planned", "in_progress", "on_hold", "completed"])
          .optional()
          .describe("Current status. Defaults to 'planned'."),
        techStack: z
          .array(z.string().trim().min(1).max(50))
          .max(20)
          .optional()
          .describe("Technologies used, e.g. ['React', 'Tailwind CSS']"),
        path: z.string().trim().optional().describe("Absolute local folder path of the project"),
        githubUrl: z.url().optional().describe("GitHub repository URL"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      try {
        const project = createProject(db, input);
        return {
          content: [
            { type: "text", text: `Created project "${project.name}".\n${JSON.stringify(project, null, 2)}` },
          ],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in create_project:", error);
        return errorResult("An unexpected error occurred while creating the project.");
      }
    }
  );

  // Tool 3: update_project (write, overwrites existing values)
  server.registerTool(
    "update_project",
    {
      title: "Update Project",
      description:
        "Update an existing project's description, status, tech stack, local folder path or GitHub URL. " +
        "Use this when the user says they started, paused, resumed or finished a project, " +
        "shares a project's GitHub link or folder path, or mentions a new technology they are using. " +
        "Only the fields you provide are changed. " +
        "Note: techStack replaces the whole list, so include existing technologies you want to keep. " +
        "To restore an archived project, set its status. To archive a project, use archive_project instead.",
      inputSchema: {
        name: z.string().trim().min(1).max(100).describe("Exact name of the existing project to update"),
        description: z.string().trim().max(500).optional().describe("New description"),
        status: z
          .enum(["planned", "in_progress", "on_hold", "completed"])
          .optional()
          .describe("New status"),
        techStack: z
          .array(z.string().trim().min(1).max(50))
          .max(20)
          .optional()
          .describe("Full new list of technologies (replaces the existing list)"),
        path: z.string().trim().optional().describe("New absolute local folder path"),
        githubUrl: z.url().optional().describe("New GitHub repository URL"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ name, ...changes }) => {
      try {
        const project = updateProject(db, name, changes);
        return {
          content: [
            { type: "text", text: `Updated project "${project.name}".\n${JSON.stringify(project, null, 2)}` },
          ],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in update_project:", error);
        return errorResult("An unexpected error occurred while updating the project.");
      }
    }
  );

  // Tool 4: archive_project (write, reversible)
  server.registerTool(
    "archive_project",
    {
      title: "Archive Project",
      description:
        "Archive a project so it is hidden from the normal project list. Nothing is deleted. " +
        "Use this when the user wants to archive, remove, delete, hide or clean up a project. " +
        "DevHub never permanently deletes projects; an archived project can be restored with update_project.",
      inputSchema: {
        name: z.string().trim().min(1).max(100).describe("Exact name of the project to archive"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ name }) => {
      try {
        const project = archiveProject(db, name);
        return {
          content: [
            {
              type: "text",
              text: `Project "${project.name}" is archived. It is hidden from the normal list and can be restored with update_project.`,
            },
          ],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in archive_project:", error);
        return errorResult("An unexpected error occurred while archiving the project.");
      }
    }
  );
}

