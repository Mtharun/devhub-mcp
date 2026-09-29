import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { DevHubError } from "../errors.js";
import { getProjectByName } from "./projectService.js";
import { resolveProjectFolder, type FolderAccessOptions } from "./projectFolder.js";

const README_FILE_NAME = "README.md";
const MAX_README_BYTES = 200 * 1024; // 200 KB

export function readProjectReadme(
  db: DatabaseSync,
  projectName: string,
  options: FolderAccessOptions = {}
): string {
  const project = getProjectByName(db, projectName);
  const folder = resolveProjectFolder(project, options);

  // The file name is fixed, never taken from input, so "../" tricks are impossible
  const readmePath = path.join(folder, README_FILE_NAME);

  let stats: fs.Stats;
  try {
    stats = fs.statSync(readmePath);
  } catch {
    throw new DevHubError(`No ${README_FILE_NAME} found in ${project.path}.`);
  }

  if (!stats.isFile()) {
    throw new DevHubError(`${readmePath} is not a file.`);
  }

  if (stats.size > MAX_README_BYTES) {
    throw new DevHubError(
      `${README_FILE_NAME} for "${project.name}" is too large to read (limit is 200 KB).`
    );
  }

  return fs.readFileSync(readmePath, "utf8");
}
