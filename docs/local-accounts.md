# Local account mode

The public build remains a browser-local finance demo. Local account mode adds an Express API and SQLite, with no cloud hosting or bank connections.

## Run

Use Node.js 24.5+ (built-in `node:sqlite` is experimental), then open two terminals in this repository:

```sh
npm ci
npm run server
```

```sh
npm run dev:accounts
```

Open http://127.0.0.1:5186 and create an account. It starts empty. Import `docs/samples/transactions.csv` or add records manually. The API is http://127.0.0.1:3186 and binds only to loopback. `FINANCE_DB` changes the database path; `FINANCE_API_PORT`, `FINANCE_APP_ORIGIN` and Vite's `FINANCE_API_TARGET` must agree if changing ports.

## Data and account behavior

- Email/password registration and sign-in. Passwords use random salts and scrypt; only hashes are stored. Sessions use random tokens with only their SHA-256 hashes stored, HttpOnly/SameSite=Strict cookies and seven-day expiry. Logout revokes the current session. Auth attempts are rate-limited in memory per server process.
- Every data query is scoped to the authenticated user. Client-supplied user IDs are ignored. The demo's Editor/Read-only selector is absent in account mode; it grants no API permissions.
- Origin checks and JSON content requirements protect state-changing endpoints. HTTP cookies are for loopback development; HTTPS origins enable Secure cookies. There is no email verification, password-reset delivery or public multi-user hosting in this version.
- Schema migrations run transactionally on startup. Amounts are stored as integer cents. Every mutation supplies a dataset version; stale tabs receive a conflict instead of overwriting newer records. Use **Reload records**, review the latest values and retry the change. Invalid import batches roll back completely.
- The simple initial API replaces this user's rows inside one SQLite transaction on each write. This favors clear atomic behavior for a 10,000-record local workspace; larger workloads would need incremental writes and pagination.
- Account transaction data is kept in memory in the UI, not persisted to localStorage. Sign-out clears it. Theme preferences may remain in this browser. Public-demo storage uses a separate key and is not copied into an account automatically.
- CSV accepts up to 5,000 rows / 2 MB, explicit column/date mapping, optional categories/types and signed amounts. Duplicate review uses date, normalized description, amount, type and category. Identical-looking legitimate transactions can be kept deliberately. All invalid rows must be fixed before importing. Exported text cells are protected against spreadsheet formula execution.
- JSON export is a versioned USD transaction backup for the current workspace. Restore replaces current records after explicit confirmation and generates new IDs. It does not restore account credentials. The demo can export user-edited records as well as sample records.

## Database backup and recovery

`.data/` and SQLite files are ignored by Git. The database contains private records and password hashes; keep backups private.

```sh
npm run db:backup -- /private/tmp/finance-private-backup.sqlite
```

The command uses SQLite's online backup API to produce a consistent snapshot even with WAL enabled. For full-database recovery, stop the API first, preserve the existing `.data` folder privately, and restore a verified backup to a fresh path. Start with `FINANCE_DB=/path/to/restored.sqlite npm run server`. Do not overwrite a live SQLite database or mix its old WAL/SHM files with a restored file. API tests open a real backup and verify migrated accounts and cent-based records survive recovery.

For ordinary transaction recovery, use the JSON backup/restore UI instead.

## Verify

```sh
npm test
npm run test:api
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:e2e:accounts
```

The account browser suite starts isolated API/UI ports and a fresh `.data/e2e-*.sqlite` database. It verifies persistence, a second account's isolation, sign-out/sign-in, and a failed server save retaining the form for retry. It never resets the normal local database. CI runs these in addition to the AWS infrastructure/release checks; cloud deployment stays disabled under the free-only requirement.

See `try-it-and-feedback.md` for the three-tester plan. Preparing that plan is not evidence that real users have tested the app.
