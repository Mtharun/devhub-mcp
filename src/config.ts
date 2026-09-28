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

export const config = {
  dataDir,
  dbPath: path.join(dataDir, "devhub.db"),
};