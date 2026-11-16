import { DatabaseSync, backup } from "node:sqlite";
import { chmodSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function openDatabase(filename) {
  if (filename !== ":memory:")
    mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)",
  );
  const dir = fileURLToPath(new URL("./migrations/", import.meta.url));
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (db.prepare("SELECT name FROM schema_migrations WHERE name=?").get(name))
      continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(readFileSync(resolve(dir, name), "utf8"));
      db.prepare("INSERT INTO schema_migrations VALUES (?)").run(name);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      db.close();
      throw e;
    }
  }
  return db;
}
export async function backupDatabase(source, destination) {
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, destination);
    chmodSync(destination, 0o600);
  } finally {
    db.close();
  }
}
