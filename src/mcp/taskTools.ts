import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { createTask, listTasks } from "../services/taskService.js";
import { DevHubError } from "../errors.js";
import { errorResult } from "./results.js";

export function registerTaskTools(server: McpServer, db: DatabaseSync): void {
  // Tool: create_task (write)
  server.registerTool(
    "create_task",
    {
      title: "Create Task",
      description:
        "Create a task inside an existing DevHub project. " +
        "Use this when the user wants to add a task, to-do, bug fix, feature or reminder for a project. " +
        "New tasks start with status 'todo'. Priority defaults to 'medium'.",
      inputSchema: {
        projectName: z.string().trim().min(1).max(100).describe("Exact name of an existing project"),
        title: z.string().trim().min(1).max(200).describe("Short task title, e.g. 'Fix login bug'"),
        description: z.string().trim().max(1000).optional().describe("Optional details or notes"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Task priority. Defaults to 'medium'."),
        dueDate: z.iso.date().optional().describe("Optional due date in YYYY-MM-DD format"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      try {
        const task = createTask(db, input);
        return {
          content: [{ type: "text", text: `Created task #${task.id}.\n${JSON.stringify(task, null, 2)}` }],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in create_task:", error);
        return errorResult("An unexpected error occurred while creating the task.");
      }
    }
  );

  // Tool: list_tasks (read-only)
  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description:
        "List tasks with their project, status, priority and due date, sorted by priority and then due date. " +
        "By default only pending tasks (todo and in_progress) are shown. " +
        "Use this when the user asks what tasks are pending, what is left to do, what to work on, or about tasks in a project.",
      inputSchema: {
        projectName: z.string().trim().min(1).max(100).optional().describe("Only show tasks from this project"),
        status: z
          .enum(["todo", "in_progress", "done", "archived"])
          .optional()
          .describe("Only show tasks with this status. If omitted, shows pending tasks."),
      },
      annotations: { readOnlyHint: true },
    },
    async (filter) => {
      try {
        const tasks = listTasks(db, filter);
        if (tasks.length === 0) {
          return { content: [{ type: "text", text: "No matching tasks found." }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in list_tasks:", error);
        return errorResult("An unexpected error occurred while listing tasks.");
      }
    }
  );
}