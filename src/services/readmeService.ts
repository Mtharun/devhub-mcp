import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { DevHubError } from "../errors.js";
import { getProjectByName } from "./projectService.js";

const README_FILE_NAME = "README.md";
const MAX_README_BYTES = 200 * 1024; // 200 KB

export function readProjectReadme(db: DatabaseSync, projectName: string): string {
  const project = getProjectByName(db, projectName);

  if (!project.path) {
    throw new DevHubError(
      `Project "${project.name}" has no local folder path. Set it first with update_project.`
    );
  }

  if (!path.isAbsolute(project.path)) {
    throw new DevHubError(
      `Project "${project.name}" has a relative path ("${project.path}"). Update it to an absolute path.`
    );
  }

  const readmePath = path.join(project.path, README_FILE_NAME);

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