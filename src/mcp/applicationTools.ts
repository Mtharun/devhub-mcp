import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  archiveApplication,
  createApplication,
  listApplications,
  updateApplication,
} from "../services/applicationService.js";
import { DevHubError } from "../errors.js";
import { errorResult } from "./results.js";

const writableStatus = z.enum(["wishlist", "applied", "interviewing", "offer", "rejected", "withdrawn"]);

const optionalFields = {
  jobUrl: z.url().optional().describe("Link to the job posting"),
  location: z.string().trim().max(100).optional().describe("Job location, e.g. 'Chennai' or 'Remote'"),
  source: z.string().trim().max(50).optional().describe("Where the job was found, e.g. 'LinkedIn', 'Naukri', 'Referral'"),
  appliedDate: z.iso.date().optional().describe("Date applied in YYYY-MM-DD format"),
  followUpDate: z.iso.date().optional().describe("Date to follow up in YYYY-MM-DD format"),
  notes: z.string().trim().max(2000).optional().describe("Free-form notes: contacts, interview rounds, salary, etc."),
};

// Every tool in this file reports errors the same way
function handleError(toolName: string, error: unknown) {
  if (error instanceof DevHubError) {
    return errorResult(error.message);
  }
  console.error(`Unexpected error in ${toolName}:`, error);
  return errorResult(`An unexpected error occurred in ${toolName}.`);
}

export function registerApplicationTools(server: McpServer, db: DatabaseSync): void {
  // Tool: create_application (write)
  server.registerTool(
    "create_application",
    {
      title: "Create Job Application",
      description:
        "Record a job application in the user's DevHub job tracker. " +
        "Use this when the user says they applied to, want to apply to, or were referred to a company. " +
        "Status defaults to 'applied' and appliedDate defaults to today; use status 'wishlist' for jobs not applied to yet.",
      inputSchema: {
        company: z.string().trim().min(1).max(100).describe("Company name, e.g. 'Zoho'"),
        role: z.string().trim().min(1).max(100).describe("Job title, e.g. 'Full Stack Developer Intern'"),
        status: writableStatus.optional().describe("Application status. Defaults to 'applied'."),
        ...optionalFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      try {
        const application = createApplication(db, input);
        return {
          content: [
            {
              type: "text",
              text: `Recorded application #${application.id}.\n${JSON.stringify(application, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return handleError("create_application", error);
      }
    }
  );

  // Tool: list_applications (read-only)
  server.registerTool(
    "list_applications",
    {
      title: "List Job Applications",
      description:
        "List the user's job applications with company, role, status, dates and notes. " +
        "Archived applications are hidden unless status 'archived' is requested. " +
        "Use this when the user asks about their job search, where they applied, interview status, " +
        "or which follow-ups are due (set followUpDue to true). Also use it to find an application's id.",
      inputSchema: {
        status: z
          .enum(["wishlist", "applied", "interviewing", "offer", "rejected", "withdrawn", "archived"])
          .optional()
          .describe("Only show applications with this status"),
        company: z.string().trim().min(1).max(100).optional().describe("Filter by company name (partial match)"),
        followUpDue: z
          .boolean()
          .optional()
          .describe("Only show active applications whose follow-up date is today or earlier"),
      },
      annotations: { readOnlyHint: true },
    },
    async (filter) => {
      try {
        const applications = listApplications(db, filter);
        if (applications.length === 0) {
          return { content: [{ type: "text", text: "No matching job applications found." }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(applications, null, 2) }] };
      } catch (error) {
        return handleError("list_applications", error);
      }
    }
  );

  // Tool: update_application (write, overwrites existing values)
  server.registerTool(
    "update_application",
    {
      title: "Update Job Application",
      description:
        "Update a job application by its id: status, follow-up date, notes, link and other details. " +
        "Use this when the user got an interview call, an offer or a rejection, withdrew, " +
        "wants a follow-up reminder, or shares new information about an application. " +
        "Notes are replaced, so include existing notes you want to keep. " +
        "If you don't know the id, call list_applications first. To archive, use archive_application.",
      inputSchema: {
        id: z.number().int().positive().describe("Application id, e.g. 3"),
        company: z.string().trim().min(1).max(100).optional().describe("Corrected company name"),
        role: z.string().trim().min(1).max(100).optional().describe("Corrected job title"),
        status: writableStatus.optional().describe("New status"),
        ...optionalFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, ...changes }) => {
      try {
        const application = updateApplication(db, id, changes);
        return {
          content: [
            {
              type: "text",
              text: `Updated application #${application.id}.\n${JSON.stringify(application, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return handleError("update_application", error);
      }
    }
  );

  // Tool: archive_application (write, reversible)
  server.registerTool(
    "archive_application",
    {
      title: "Archive Job Application",
      description:
        "Archive a job application so it is hidden from normal lists. Nothing is deleted. " +
        "Use this when the user wants to archive, remove, delete or clean up an application. " +
        "An archived application can be restored with update_application by setting a status.",
      inputSchema: {
        id: z.number().int().positive().describe("Application id, e.g. 3"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const application = archiveApplication(db, id);
        return {
          content: [
            {
              type: "text",
              text: `Application #${application.id} (${application.company}, ${application.role}) is archived. It can be restored with update_application.`,
            },
          ],
        };
      } catch (error) {
        return handleError("archive_application", error);
      }
    }
  );
}
