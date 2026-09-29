import fs from "node:fs";
import { config } from "../config.js";
import { openDatabase } from "../db/database.js";
import { createWebServer } from "./server.js";

fs.mkdirSync(config.dataDir, { recursive: true });
const db = openDatabase(config.dbPath);
const server = createWebServer(db);

// 127.0.0.1 = this computer only. Other devices on your Wi-Fi cannot open the dashboard.
server.listen(config.webPort, "127.0.0.1", () => {
  console.log(`DevHub dashboard: http://localhost:${config.webPort}`);
  console.log("Press Ctrl + C to stop.");
});
