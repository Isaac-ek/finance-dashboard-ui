import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app.mjs";
import { openDatabase, backupDatabase } from "./db.mjs";
const origin = "http://127.0.0.1:5186";
const tx = {
  name: "Lunch",
  date: "2026-11-16",
  amount: 10.25,
  category: "Food",
  type: "expense",
};
async function setup(t, path = ":memory:", clock = Date.now) {
  const db = openDatabase(path),
    app = createApp(db, { origin, clock });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    db.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (
    method,
    path,
    body,
    cookie = "",
    requestOrigin = origin,
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: requestOrigin,
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      headers: response.headers,
    };
  };
  const register = async (email) =>
    call("POST", "/api/auth/register", {
      email,
      password: "test password with 20 chars",
    });
  return { db, call, register };
}
test("accounts hash passwords, use private cookies, start empty and revoke sessions on logout", async (t) => {
  const { db, call, register } = await setup(t);
  const account = await register("One@example.com");
  assert.equal(account.status, 201);
  assert.match(account.headers.get("set-cookie"), /HttpOnly/);
  assert.match(account.headers.get("set-cookie"), /SameSite=Strict/);
  assert.ok(
    !db
      .prepare("SELECT password_hash FROM users")
      .get()
      .password_hash.includes("test password"),
  );
  assert.equal((await call("GET", "/api/transactions")).status, 401);
  assert.deepEqual(
    (await call("GET", "/api/transactions", undefined, account.cookie)).data
      .transactions,
    [],
  );
  assert.equal(
    (
      await call("POST", "/api/auth/login", {
        email: "one@example.com",
        password: "wrong password long enough",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call("POST", "/api/auth/login", {
        email: "ONE@example.com",
        password: "test password with 20 chars",
      })
    ).status,
    200,
  );
  await call("POST", "/api/auth/logout", {}, account.cookie);
  assert.equal(
    (await call("GET", "/api/auth/me", undefined, account.cookie)).status,
    401,
  );
});
test("user IDs cannot be forged; another account cannot read, edit, delete or restore into an owner", async (t) => {
  const { call, register } = await setup(t);
  const a = await register("a@example.com"),
    b = await register("b@example.com");
  const saved = await call(
    "POST",
    "/api/transactions",
    { version: 0, transaction: { ...tx, user_id: b.data.user.id } },
    a.cookie,
  );
  assert.equal(saved.status, 200);
  const id = saved.data.transactions[0].id;
  assert.equal(
    (await call("GET", "/api/transactions", undefined, b.cookie)).data
      .transactions.length,
    0,
  );
  for (const method of ["PUT", "DELETE"])
    assert.equal(
      (
        await call(
          method,
          "/api/transactions/" + id,
          { version: 0, transaction: tx },
          b.cookie,
        )
      ).status,
      404,
    );
  await call(
    "PUT",
    "/api/transactions/restore",
    { version: 0, entries: [] },
    b.cookie,
  );
  assert.equal(
    (await call("GET", "/api/transactions", undefined, a.cookie)).data
      .transactions.length,
    1,
  );
});
test("stale versions and invalid batches leave the previous data unchanged", async (t) => {
  const { call, register } = await setup(t),
    a = await register("a@example.com");
  await call(
    "POST",
    "/api/transactions",
    { version: 0, transaction: tx },
    a.cookie,
  );
  assert.equal(
    (
      await call(
        "POST",
        "/api/transactions",
        { version: 0, transaction: tx },
        a.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await call(
        "POST",
        "/api/transactions/import",
        {
          version: 1,
          skipDuplicates: false,
          entries: [tx, { ...tx, amount: -1 }],
        },
        a.cookie,
      )
    ).status,
    400,
  );
  const before = (await call("GET", "/api/transactions", undefined, a.cookie))
    .data;
  assert.equal(before.transactions.length, 1);
  assert.equal(before.version, 1);
  const batch = await call(
    "POST",
    "/api/transactions/import",
    {
      version: 1,
      skipDuplicates: true,
      entries: [tx, { ...tx, name: "Dinner" }],
    },
    a.cookie,
  );
  assert.equal(batch.data.transactions.length, 2);
  assert.equal(batch.data.version, 2);
  const restore = await call(
    "PUT",
    "/api/transactions/restore",
    { version: 2, entries: [{ ...tx, amount: 23.45 }] },
    a.cookie,
  );
  assert.equal(restore.data.transactions.length, 1);
  assert.equal(restore.data.transactions[0].amount, 23.45);
});
test("foreign-origin writes and expired cookies are rejected", async (t) => {
  let now = Date.now();
  const { call, register } = await setup(t, ":memory:", () => now);
  const a = await register("a@example.com");
  assert.equal(
    (
      await call(
        "POST",
        "/api/transactions",
        { version: 0, transaction: tx },
        a.cookie,
        "https://elsewhere.example",
      )
    ).status,
    403,
  );
  now += 8 * 86400000;
  assert.equal(
    (await call("GET", "/api/transactions", undefined, a.cookie)).status,
    401,
  );
});
test("database migrations are repeatable and a live SQLite backup restores accounts and records", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "finance-db-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, "source.sqlite"),
    target = join(dir, "backup.sqlite");
  const { call, register } = await setup(t, source);
  const a = await register("restore@example.com");
  await call(
    "POST",
    "/api/transactions",
    { version: 0, transaction: tx },
    a.cookie,
  );
  await backupDatabase(source, target);
  const restored = openDatabase(target);
  assert.equal(
    restored.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get().n,
    1,
  );
  assert.equal(
    restored.prepare("SELECT email FROM users").get().email,
    "restore@example.com",
  );
  assert.equal(
    restored.prepare("SELECT amount_cents FROM transactions").get()
      .amount_cents,
    1025,
  );
  restored.close();
});
