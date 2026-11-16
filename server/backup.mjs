import { backupDatabase } from "./db.mjs";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const source = process.env.FINANCE_DB || ".data/finance.sqlite";
const target = process.argv[2];
if (
  !existsSync(source) ||
  !target ||
  resolve(source) === resolve(target) ||
  existsSync(target)
)
  throw new Error(
    "Choose an existing source DB and a new, different backup filename: npm run db:backup -- /path/finance-backup.sqlite",
  );
await backupDatabase(source, target);
console.log(
  "SQLite backup completed. Store this file privately: it contains account and transaction records.",
);
