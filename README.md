# Finance overview

A browser-local personal finance demo built with React, TypeScript, Zustand and Recharts. It demonstrates one complete workflow: add a transaction, see the selected month's totals and charts update, edit the record, then delete and undo it.

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
- Transactions, theme, mode, reporting month and filters persist in this browser. Reset sample data asks before discarding edits. No bank connections, customer accounts or backend services are involved.
- Native modal dialogs support keyboard dismissal, focus trapping and return focus. The charts also expose exact figures as text; the transaction table fits small screens.

## Source layout

`src/lib/analytics.ts` contains cent-based aggregations; `dates.ts` handles local date-only values; `demo.ts` rebases and recognizes unedited fixtures. `src/store/useFinanceStore.ts` owns browser-local state. Components cover the overview, charts, insights, table and transaction form. The seed fixture is `src/data/mockTransactions.json`.

The app uses system fonts and serves static Vite output, with no external font stylesheet or runtime API dependency. The hosted demo is linked from [Chiemelie Ekezie's portfolio](https://ekezie-chiemelie.vercel.app/).
