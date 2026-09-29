import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { listTasks, type Task } from "../services/taskService.js";
import { listApplications, type Application } from "../services/applicationService.js";
import { todayLocal } from "../utils/dates.js";

function formatTaskLine(task: Task): string {
  return (
    `- #${task.id} [${task.priority}] ${task.title} ` +
    `(project: ${task.projectName}, status: ${task.status}, due: ${task.dueDate ?? "none"})`
  );
}

function formatFollowUpLine(application: Application): string {
  return (
    `- Application #${application.id}: ${application.role} at ${application.company} ` +
    `(status: ${application.status}, follow up: ${application.followUpDate})`
  );
}

export function buildPlanMyDayText(db: DatabaseSync, hours?: string, today: string = todayLocal()): string {
  const tasks = listTasks(db);
  const followUps = listApplications(db, { followUpDue: true, today });

  const taskList = tasks.length === 0 ? "No pending tasks." : tasks.map(formatTaskLine).join("\n");

  const timeLine = hours
    ? `I have about ${hours} hours available today.`
    : "I haven't said how much time I have today.";

  const followUpSection =
    followUps.length === 0
      ? ""
      : `Job application follow-ups that are due:\n${followUps.map(formatFollowUpLine).join("\n")}\n\n`;

  return (
    `Today is ${today}. ${timeLine}\n\n` +
    `Here are my pending DevHub tasks, sorted by priority and due date:\n` +
    `${taskList}\n\n` +
    followUpSection +
    `Please suggest up to 3 things I should work on today, in order, with one line on why for each. ` +
    `Flag anything overdue or due within 2 days, including follow-ups. ` +
    `If a task looks too big for today, suggest a smaller first step. Keep it short.`
  );
}

export function registerPrompts(server: McpServer, db: DatabaseSync): void {
  server.registerPrompt(
    "plan_my_day",
    {
      title: "Plan My Day",
      description: "Suggest what to work on today based on your pending DevHub tasks and job follow-ups",
      argsSchema: {
        hours: z.string().optional().describe("How many hours you have today, e.g. '3'"),
      },
    },
    ({ hours }) => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: buildPlanMyDayText(db, hours) },
        },
      ],
    })
  );
}
