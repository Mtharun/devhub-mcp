import fs from "node:fs";
import { config } from "./config.js";
import { openDatabase } from "./db/database.js";

fs.mkdirSync(config.dataDir, { recursive: true });

const db = openDatabase(config.dbPath);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all();

console.error("Tables in database:", tables);

db.close();