import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { getProjectByName } from "./projectService.js";
import { resolveProjectFolder, type FolderAccessOptions } from "./projectFolder.js";

// Folders that are generated, huge or private: never walk into them
const SKIPPED_FOLDERS = new Set([
  "node_modules", ".git", "build", "dist", "out", "coverage", ".next", ".nuxt", ".turbo",
  ".cache", ".venv", "venv", "__pycache__", "target", "vendor", ".idea", ".vscode",
]);

// Only plain source/text files are read. Note: .env files are deliberately NOT here (they hold secrets).
const SCANNED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro",
  ".py", ".java", ".kt", ".go", ".rs", ".c", ".h", ".cpp", ".cs", ".php", ".rb", ".swift", ".dart",
  ".html", ".css", ".scss", ".sass", ".less", ".md", ".mdx", ".yml", ".yaml", ".sh", ".ps1", ".sql",
]);

const MAX_FILE_BYTES = 1024 * 1024; // 1 MB
const MAX_FILES = 5000;
const MAX_TEXT_LENGTH = 200;
export const DEFAULT_MAX_RESULTS = 100;

const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX|BUG)\b[:\s-]*(.*)$/;

export interface TodoItem {
  file: string; // relative to the project folder, always with forward slashes
  line: number;
  tag: string;
  text: string;
}

export interface TodoScanResult {
  projectName: string;
  items: TodoItem[];
  filesScanned: number;
  truncated: boolean;
}

export interface ScanOptions extends FolderAccessOptions {
  maxResults?: number;
}

function cleanText(raw: string): string {
  // Drop trailing comment closers like */ or -->
  const text = raw.replace(/\s*(\*\/|-->)\s*$/, "").trim();
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
}

export function findTodos(db: DatabaseSync, projectName: string, options: ScanOptions = {}): TodoScanResult {
  const project = getProjectByName(db, projectName);
  const root = resolveProjectFolder(project, options);
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;

  const items: TodoItem[] = [];
  let filesScanned = 0;
  let truncated = false;
  const folders: string[] = [root];

  // Iterative walk (a stack instead of recursion) so very deep folders cannot overflow the call stack
  while (folders.length > 0 && !truncated) {
    const folder = folders.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch {
      continue; // a folder we are not allowed to read: skip it instead of failing the whole scan
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    const subfolders: string[] = [];

    for (const entry of entries) {
      // Symlinks could point outside the project folder: never follow them
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        if (!SKIPPED_FOLDERS.has(entry.name)) subfolders.push(fullPath);
        continue;
      }

      if (!entry.isFile() || !SCANNED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      if (fs.statSync(fullPath).size > MAX_FILE_BYTES) continue;

      if (filesScanned >= MAX_FILES) {
        truncated = true;
        break;
      }
      filesScanned++;

      const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        const match = TODO_PATTERN.exec(lines[index]);
        if (!match) continue;

        if (items.length >= maxResults) {
          truncated = true;
          break;
        }
        items.push({
          file: path.relative(root, fullPath).split(path.sep).join("/"),
          line: index + 1,
          tag: match[1],
          text: cleanText(match[2]),
        });
      }
      if (truncated) break;
    }

    // Reverse so that pop() visits subfolders in alphabetical order
    folders.push(...subfolders.reverse());
  }

  return { projectName: project.name, items, filesScanned, truncated };
}
