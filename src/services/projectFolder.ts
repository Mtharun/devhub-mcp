import fs from "node:fs";
import path from "node:path";
import { DevHubError } from "../errors.js";
import type { Project } from "./projectService.js";

export interface FolderAccessOptions {
  // If non-empty, project folders must live inside one of these absolute paths.
  allowedRoots?: string[];
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function realPathOrNull(folder: string): string | null {
  try {
    return fs.realpathSync(folder);
  } catch {
    return null;
  }
}

// Checks a project's folder before any file is read from it and returns its real (symlink-free) path.
export function resolveProjectFolder(project: Project, options: FolderAccessOptions = {}): string {
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

  const folder = realPathOrNull(project.path);
  if (!folder || !fs.statSync(folder).isDirectory()) {
    throw new DevHubError(`The folder for "${project.name}" (${project.path}) does not exist.`);
  }

  const roots = options.allowedRoots ?? [];
  if (roots.length > 0) {
    const allowed = roots
      .map(realPathOrNull)
      .some((root) => root !== null && isInside(root, folder));
    if (!allowed) {
      throw new DevHubError(
        `DevHub is not allowed to read ${project.path}. It must be inside one of the folders in DEVHUB_ALLOWED_ROOTS.`
      );
    }
  }

  return folder;
}
