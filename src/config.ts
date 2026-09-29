import path from "node:path";

const dataDir = process.env.DEVHUB_DATA_DIR;

if (!dataDir) {
  throw new Error(
    "DEVHUB_DATA_DIR is not set. Copy .env.example to .env and set the path."
  );
}

if (!path.isAbsolute(dataDir)) {
  throw new Error(`DEVHUB_DATA_DIR must be an absolute path. Got: ${dataDir}`);
}

// Optional: semicolon-separated absolute folders that DevHub may read project files from.
// ";" is used (not ",") because Windows paths contain ":" and folder names may contain ",".
const allowedRoots = (process.env.DEVHUB_ALLOWED_ROOTS ?? "")
  .split(";")
  .map((root) => root.trim())
  .filter((root) => root.length > 0);

for (const root of allowedRoots) {
  if (!path.isAbsolute(root)) {
    throw new Error(`Every DEVHUB_ALLOWED_ROOTS entry must be an absolute path. Got: ${root}`);
  }
}

const webPort = Number(process.env.DEVHUB_WEB_PORT ?? "4321");

if (!Number.isInteger(webPort) || webPort < 1 || webPort > 65535) {
  throw new Error(`DEVHUB_WEB_PORT must be a port number between 1 and 65535. Got: ${process.env.DEVHUB_WEB_PORT}`);
}

export const config = {
  dataDir,
  dbPath: path.join(dataDir, "devhub.db"),
  allowedRoots,
  webPort,
};
