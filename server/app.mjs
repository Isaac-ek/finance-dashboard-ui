import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  validateTransaction,
  appendTransactions,
  MAX_TRANSACTIONS,
} from "../src/lib/transactions.ts";
const scrypt = promisify(scryptCallback);
const hash = (token) => createHash("sha256").update(token).digest("hex");
const cookieName = "finance_session";
const sessionAge = 7 * 24 * 60 * 60 * 1000;
export function createApp(
  db,
  { origin = "http://127.0.0.1:5186", clock = Date.now } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    next();
  });
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD"].includes(req.method) &&
      (req.get("origin") !== origin || !req.is("application/json"))
    )
      return res
        .status(403)
        .json({
          error:
            "Use this application to make changes. Cross-origin requests are blocked.",
        });
    next();
  });
  app.use(express.json({ limit: "8mb" }));
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many account attempts. Try again in 15 minutes." },
  });
  const snapshot = (userId) => ({
    transactions: db
      .prepare(
        "SELECT id, name, date, amount_cents / 100.0 AS amount, category, type FROM transactions WHERE user_id=? ORDER BY date DESC,id",
      )
      .all(userId),
    version: db.prepare("SELECT data_version FROM users WHERE id=?").get(userId)
      .data_version,
  });
  function requireUser(req, res, next) {
    const cookies = Object.fromEntries(
      (req.get("cookie") || "").split(";").map((c) => c.trim().split("=")),
    );
    const token = cookies[cookieName];
    const user =
      token &&
      db
        .prepare(
          "SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?",
        )
        .get(hash(token), clock());
    if (!user) return res.status(401).json({ error: "Sign in to continue." });
    req.user = user;
    req.token = token;
    next();
  }
  function setSession(userId, res) {
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(clock());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      hash(token),
      userId,
      clock() + sessionAge,
    );
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: origin.startsWith("https:"),
      path: "/api",
      maxAge: sessionAge,
    });
  }
  function credentials(body) {
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 128
    )
      throw Object.assign(
        new Error("Use an email and a password between 12 and 128 characters."),
        { status: 400 },
      );
    return { email, password: body.password };
  }
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", storage: "sqlite", mode: "local-accounts" }),
  );
  app.post("/api/auth/register", authLimit, async (req, res, next) => {
    try {
      const { email, password } = credentials(req.body),
        salt = randomBytes(16).toString("hex");
      const derived = await scrypt(password, salt, 64);
      const id = randomUUID();
      try {
        db.prepare(
          "INSERT INTO users(id,email,password_hash,created_at) VALUES (?,?,?,?)",
        ).run(id, email, `${salt}:${derived.toString("hex")}`, clock());
      } catch (e) {
        if (
          e.code?.startsWith("ERR_SQLITE") &&
          db.prepare("SELECT id FROM users WHERE email=?").get(email)
        )
          return res
            .status(409)
            .json({
              error: "This email is already registered. Sign in instead.",
            });
        throw e;
      }
      setSession(id, res);
      res.status(201).json({ user: { id, email } });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/auth/login", authLimit, async (req, res, next) => {
    try {
      const { email, password } = credentials(req.body);
      const user = db
        .prepare("SELECT id,email,password_hash FROM users WHERE email=?")
        .get(email);
      const [salt, expected] = (
        user?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`
      ).split(":");
      const derived = await scrypt(password, salt, 64);
      if (!user || !timingSafeEqual(derived, Buffer.from(expected, "hex")))
        return res
          .status(401)
          .json({ error: "Email or password is incorrect." });
      setSession(user.id, res);
      res.json({ user: { id: user.id, email: user.email } });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/auth/me", requireUser, (req, res) =>
    res.json({ user: req.user }),
  );
  app.post("/api/auth/logout", requireUser, (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(req.token));
    res.clearCookie(cookieName, {
      path: "/api",
      httpOnly: true,
      sameSite: "strict",
      secure: origin.startsWith("https:"),
    });
    res.json({ ok: true });
  });
  app.use("/api/transactions", requireUser);
  app.get("/api/transactions", (req, res) => res.json(snapshot(req.user.id)));
  function mutate(req, res, transform) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const current = snapshot(req.user.id);
      if (
        !Number.isInteger(req.body.version) ||
        req.body.version !== current.version
      )
        throw Object.assign(
          new Error(
            "Your records changed in another tab. Reload the latest records before trying again.",
          ),
          { status: 409 },
        );
      const next = transform(current.transactions);
      if (next.length > MAX_TRANSACTIONS)
        throw new Error("Workspace supports up to 10,000 records.");
      db.prepare("DELETE FROM transactions WHERE user_id=?").run(req.user.id);
      const insert = db.prepare(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?)",
      );
      for (const t of next)
        insert.run(
          t.id,
          req.user.id,
          t.name,
          t.date,
          Math.round(t.amount * 100),
          t.category,
          t.type,
        );
      db.prepare("UPDATE users SET data_version=data_version+1 WHERE id=?").run(
        req.user.id,
      );
      db.exec("COMMIT");
      res.json(snapshot(req.user.id));
    } catch (e) {
      db.exec("ROLLBACK");
      res.status(e.status || 400).json({ error: e.message });
    }
  }
  app.post("/api/transactions/import", (req, res) =>
    mutate(req, res, (current) => {
      if (
        !Array.isArray(req.body.entries) ||
        req.body.entries.length > 5000 ||
        typeof req.body.skipDuplicates !== "boolean"
      )
        throw new Error(
          "Import up to 5,000 rows and choose duplicate handling.",
        );
      return appendTransactions(
        current,
        req.body.entries,
        req.body.skipDuplicates,
      );
    }),
  );
  app.put("/api/transactions/restore", (req, res) =>
    mutate(req, res, () => {
      if (
        !Array.isArray(req.body.entries) ||
        req.body.entries.length > MAX_TRANSACTIONS
      )
        throw new Error("Invalid backup record count.");
      return req.body.entries.map((v) => ({
        ...validateTransaction(v),
        id: randomUUID(),
      }));
    }),
  );
  app.post("/api/transactions", (req, res) =>
    mutate(req, res, (current) => [
      { ...validateTransaction(req.body.transaction), id: randomUUID() },
      ...current,
    ]),
  );
  app.put("/api/transactions/:id", (req, res) =>
    mutate(req, res, (current) => {
      if (!current.some((t) => t.id === req.params.id))
        throw Object.assign(new Error("Transaction not found."), {
          status: 404,
        });
      const values = validateTransaction(req.body.transaction);
      return current.map((t) =>
        t.id === req.params.id ? { ...t, ...values } : t,
      );
    }),
  );
  app.delete("/api/transactions/:id", (req, res) =>
    mutate(req, res, (current) => {
      if (!current.some((t) => t.id === req.params.id))
        throw Object.assign(new Error("Transaction not found."), {
          status: 404,
        });
      return current.filter((t) => t.id !== req.params.id);
    }),
  );
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use((error, _req, res, _next) => {
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    if (status >= 500) console.error("Finance API error:", error.message);
    res
      .status(status)
      .json({
        error:
          status >= 500
            ? "The local server could not complete this request."
            : error.message,
      });
  });
  return app;
}
