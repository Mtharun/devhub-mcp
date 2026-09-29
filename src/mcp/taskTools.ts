import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { archiveTask, createTask, listTasks, updateTask } from "../services/taskService.js";
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
        "List tasks with their id, project, status, priority and due date, sorted by priority and then due date. " +
        "By default only pending tasks (todo and in_progress) are shown. " +
        "Use this when the user asks what tasks are pending, what is left to do, what to work on, or about tasks in a project. " +
        "Also use it to find a task's id before updating or archiving it.",
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

  // Tool: update_task (write, overwrites existing values)
  server.registerTool(
    "update_task",
    {
      title: "Update Task",
      description:
        "Update a task's title, description, status, priority or due date by its id. " +
        "Use this when the user says they started, finished or completed a task, " +
        "or wants to change a task's priority, deadline or wording. " +
        "Finished tasks should get status 'done'. Only the fields you provide are changed. " +
        "If you don't know the task id, call list_tasks first. To archive or delete a task, use archive_task.",
      inputSchema: {
        id: z.number().int().positive().describe("Task id, e.g. 4 for task #4"),
        title: z.string().trim().min(1).max(200).optional().describe("New title"),
        description: z.string().trim().max(1000).optional().describe("New description"),
        status: z.enum(["todo", "in_progress", "done"]).optional().describe("New status"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("New priority"),
        dueDate: z.iso.date().optional().describe("New due date in YYYY-MM-DD format"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, ...changes }) => {
      try {
        const task = updateTask(db, id, changes);
        return {
          content: [{ type: "text", text: `Updated task #${task.id}.\n${JSON.stringify(task, null, 2)}` }],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in update_task:", error);
        return errorResult("An unexpected error occurred while updating the task.");
      }
    }
  );

  // Tool: archive_task (write, reversible)
  server.registerTool(
    "archive_task",
    {
      title: "Archive Task",
      description:
        "Archive a task so it no longer appears in pending lists. Nothing is deleted. " +
        "Use this when the user wants to archive, remove, delete or cancel a task. " +
        "DevHub never permanently deletes tasks; an archived task can be restored with update_task by setting a status. " +
        "If you don't know the task id, call list_tasks first.",
      inputSchema: {
        id: z.number().int().positive().describe("Task id, e.g. 3 for task #3"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      try {
        const task = archiveTask(db, id);
        return {
          content: [
            {
              type: "text",
              text: `Task #${task.id} "${task.title}" is archived. It can be restored with update_task.`,
            },
          ],
        };
      } catch (error) {
        if (error instanceof DevHubError) {
          return errorResult(error.message);
        }
        console.error("Unexpected error in archive_task:", error);
        return errorResult("An unexpected error occurred while archiving the task.");
      }
    }
  );
}