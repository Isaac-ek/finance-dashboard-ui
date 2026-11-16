# Finance overview

A personal finance interface with a browser-local demo and an optional local account/API mode, built with React, TypeScript, Zustand and Recharts. It demonstrates one complete workflow: add a transaction, see the selected month's totals and charts update, edit the record, then delete and undo it.

## Run and verify

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If Chrome is installed, `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e` uses it instead. The browser tests start the production preview on port 5185 when needed; build first. Set `FINANCE_TEST_ORIGIN` to verify another deployment with isolated browser storage.

## Behavior

- A reporting-month selector controls income, expenses, spending categories, insights, and the transaction list. Net balance includes all entries through that month. The cash-flow chart ends at the selected month and includes the preceding five months.
- Table search/type filters affect the list; they do not change the monthly overview. New and edited transactions move the view to their month and clear list filters so the saved record remains visible.
- Amounts accept cents; aggregation uses integer cents. Zero previous-month expenses produce a descriptive comparison rather than a fabricated percentage decrease.
- New sample data is rebased into the latest six months. Persisted, untouched sample data rolls forward when a new month starts. Edited records retain their original dates and amounts. Older saved datasets migrate without overwriting visitor changes.
- Editor and read-only modes preview interface behavior. They are not authentication or server-side permissions. Transaction editing and sample resets are disabled in the read-only preview.
- Transactions, theme, mode, reporting month and filters persist in this browser. Reset sample data asks before discarding edits. The public demo has no bank connection or account service. Optional local account mode uses a separate SQLite API; see below.
- Native modal dialogs support keyboard dismissal, focus trapping and return focus. The charts also expose exact figures as text; the transaction table fits small screens.

## Source layout

`src/lib/analytics.ts` contains cent-based aggregations; `dates.ts` handles local date-only values; `demo.ts` rebases and recognizes unedited fixtures. `src/store/useFinanceStore.ts` owns browser-local state. Components cover the overview, charts, insights, table and transaction form. The seed fixture is `src/data/mockTransactions.json`.

The app uses system fonts and serves static Vite output, with no external font stylesheet or runtime API dependency. The hosted demo is linked from [Chiemelie Ekezie's portfolio](https://ekezie-chiemelie.vercel.app/).

## AWS pipeline exercise

[![Finance checks](https://github.com/Isaac-ek/finance-dashboard-ui/actions/workflows/finance.yml/badge.svg)](https://github.com/Isaac-ek/finance-dashboard-ui/actions/workflows/finance.yml)

GitHub Actions tests the app, release failure handling and CDK infrastructure, builds a checksum-verified release, runs browser workflows and uploads the build/template for inspection. See [the AWS exercise guide](docs/aws-pipeline.md) for architecture, local practice and rollback behavior.

**AWS cloud deployment is disabled.** Free-only operation was requested; an active AWS Free account plan has not been confirmed. No AWS hosting resources have been provisioned for this exercise. Checks and template synthesis work without AWS credentials; future publishing requires verified eligibility and an explicit deployment variable. The existing Vercel demo remains available.

## Import, export and local accounts

Use **Import & export** to map CSV columns, review row errors and possible duplicates, export all records, or download/restore a versioned JSON backup. Imports support ISO, day-first and month-first dates; amounts are USD and never converted. Restore/replacement asks before replacing existing data.

[Local account mode](docs/local-accounts.md) adds registration/sign-in, user-scoped SQLite records, conflict-safe writes and database backup/recovery. Run `npm run server` and `npm run dev:accounts` in separate terminals, then open http://127.0.0.1:5186. This local API is not deployed on Vercel. The public build continues to run without API calls.

[Fictional CSV samples and the tester checklist](docs/try-it-and-feedback.md) are ready for three usability sessions; no user-feedback results are claimed yet.
