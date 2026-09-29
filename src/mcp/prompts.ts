import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { listTasks, type Task } from "../services/taskService.js";

function formatTaskLine(task: Task): string {
  return (
    `- #${task.id} [${task.priority}] ${task.title} ` +
    `(project: ${task.projectName}, status: ${task.status}, due: ${task.dueDate ?? "none"})`
  );
}

export function registerPrompts(server: McpServer, db: DatabaseSync): void {
  server.registerPrompt(
    "plan_my_day",
    {
      title: "Plan My Day",
      description: "Suggest what to work on today based on your pending DevHub tasks",
      argsSchema: {
        hours: z.string().optional().describe("How many hours you have today, e.g. '3'"),
      },
    },
    ({ hours }) => {
      const today = new Date().toLocaleDateString("en-CA");
      const tasks = listTasks(db);

      const taskList =
        tasks.length === 0 ? "No pending tasks." : tasks.map(formatTaskLine).join("\n");

      const timeLine = hours
        ? `I have about ${hours} hours available today.`
        : "I haven't said how much time I have today.";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Today is ${today}. ${timeLine}\n\n` +
                `Here are my pending DevHub tasks, sorted by priority and due date:\n` +
                `${taskList}\n\n` +
                `Please suggest the top 3 tasks I should work on today, in order, with one line on why for each. ` +
                `Flag anything overdue or due within 2 days. ` +
                `If a task looks too big for today, suggest a smaller first step. Keep it short.`,
            },
          },
        ],
      };
    }
  );
}