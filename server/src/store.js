import fs from "node:fs";
import path from "node:path";

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "database.json");

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({ users: [], documents: [], invites: [] }, null, 2));
}

export function readDb() {
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

export function writeDb(db) {
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}
