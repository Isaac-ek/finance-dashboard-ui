import { openDatabase } from "./db.mjs";
import { createApp } from "./app.mjs";
const port = Number(process.env.FINANCE_API_PORT || 3186);
const db = openDatabase(process.env.FINANCE_DB || ".data/finance.sqlite");
const app = createApp(db, {
  origin: process.env.FINANCE_APP_ORIGIN || "http://127.0.0.1:5186",
});
const server = app.listen(port, "127.0.0.1", () =>
  console.log(`Finance local API: http://127.0.0.1:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
