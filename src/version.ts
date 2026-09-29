import fs from "node:fs";

// package.json is the single source of truth for the version number.
// This file compiles to build/version.js, so ../package.json is the project root.
const packageJson = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version: string };

export const VERSION = packageJson.version;
