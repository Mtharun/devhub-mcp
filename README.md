# DevHub MCP

A personal developer assistant built as a **Model Context Protocol (MCP) server**. It lets AI assistants like Claude manage my software projects through natural language, backed by a local SQLite database.

> "Show me my current projects." · "I started working on portfolio-website." · "Archive test-project."

## Why I built this

As a 2026 full stack developer fresher, I wanted to learn MCP by building something I would actually use every day, not a toy example. I keep losing track of my projects, tasks and learning progress across different folders and notes, so I am building one local assistant that my AI can talk to. This project is the first step towards my own personal AI assistant that will eventually help with GitHub, job applications and interview preparation.

## Features (v0.2)

- **List projects**: status, description, tech stack, local path, GitHub URL
- **Create projects**: validated input, unique names
- **Update projects**: partial updates (only the fields you provide change)
- **Archive projects**: no hard deletes; archived projects can be restored
- **Friendly errors**: clear, actionable messages the AI can act on
- **Tasks**: create, list, update and archive tasks with priorities and due dates
- **Smart ordering**: pending tasks sorted by priority, then due date
- **Project README access**: as an MCP resource template (`project://{name}/readme`) and a read tool

## Example

| You say to Claude | What happens |
|---|---|
| "Show me my current projects." | `list_projects` returns active projects |
| "Add my portfolio project, using React and Tailwind." | `create_project` with name, stack and status |
| "Update DevHub: I started working on portfolio-website." | `update_project` sets status to `in_progress` |
| "Delete test-project." | `archive_project` hides it safely (nothing is deleted) |

## Architecture

```
Claude Desktop (MCP host)
        │  JSON-RPC over stdio
        ▼
src/index.ts                  → bootstrap: config, database, server
src/mcp/projectTools.ts       → MCP layer: input validation (zod), result formatting
src/services/projectService.ts→ service layer: business logic, friendly errors
src/mcp/taskTools.ts          → task tools
src/mcp/readmeFeatures.ts     → README resource template + tool
src/services/taskService.ts   → task logic (JOIN, sorting)
src/services/readmeService.ts → safe README file reading
src/db/database.ts            → data layer: SQLite schema and connection
```

The MCP layer stays thin, so the same service layer can later power a REST API and a React dashboard.

## Tech stack

| Technology | Why |
|---|---|
| TypeScript (strict) | Type safety and early error detection |
| Node.js 22 | Runtime, built-in `node:sqlite` and `--env-file` (no extra dependencies) |
| MCP TypeScript SDK (v1) | Official protocol implementation |
| zod | Input validation for every tool |
| SQLite | Single-file local database, no server needed |

## Setup

**Requirements:** Node.js 22+, Claude Desktop

```bash
git clone https://github.com/Mtharun/devhub-mcp.git
cd devhub-mcp
npm install
cp .env.example .env    # then set DEVHUB_DATA_DIR to an absolute path
npm run build
```

Add the server to your Claude Desktop config (`claude_desktop_config.json`, open it via Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "devhub": {
      "command": "node",
      "args": ["/absolute/path/to/devhub-mcp/build/index.js"],
      "env": { "DEVHUB_DATA_DIR": "/absolute/path/to/devhub-data" }
    }
  }
}
```

Fully quit and restart Claude Desktop after any config or code change.

## Security and safety design

- **Local-first:** all data stays in a local SQLite file outside the repository
- **No hard deletes:** projects are archived, never permanently removed
- **SQL injection safe:** all values use parameterized queries (`?` placeholders)
- **Input limits:** zod enforces lengths, enums and URL formats
- **Tool annotations:** read-only and destructive hints for host approval flows
- **Database constraints:** `UNIQUE`, `CHECK` and foreign keys as a last line of defense

## Roadmap

- [x] Project management (list, create, update, archive)
- [x] Tasks per project (priorities, due dates)
- [x] Project README as an MCP resource
- [ ] `plan_my_day` prompt
- [ ] Automated tests (`node:test`)
- [ ] TODO scanner for local project folders
- [ ] Job application tracker
- [ ] REST API and React dashboard

## About

Built by Tharun as a hands-on way to learn MCP, TypeScript and full stack architecture.