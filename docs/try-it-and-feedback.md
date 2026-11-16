# Finance usability session

Status: ready for testers; no feedback or adoption results have been collected yet. The target is three volunteers. Do not report this target as a user count.

## What to send a tester

Use the public Vercel demo for browser-local import/export, or run local account mode on the tester's own computer. The local account server listens on loopback and is not a public account service. Use the fictional files in `docs/samples/`; no real bank statement is needed. Amounts are USD and no currency conversion occurs.

Suggested invitation text, for the owner to send:

> Could you try this finance interface for ten minutes? Use the fictional CSV I provide. I'd like to watch where it becomes confusing. Please import the records, correct an expense, export a backup, and restore it. You don't need to share financial information.

This file is a draft invitation; no messages have been sent automatically.

## Tasks (let the person work before explaining)

1. Find import/export. Load `invalid-transactions.csv`. Explain which rows need fixing and whether anything was saved.
2. Load `transactions.csv`. Map columns and identify the repeated grocery entry. Choose whether to keep or skip it. Decide whether to append or replace the sample records.
3. Find the imported month. Correct one expense and check its effect on the overview.
4. Download a JSON backup and CSV. Change or delete a record, then restore the backup after reviewing the replacement prompt.
5. Reload the page and find the records again. In local account mode, sign out and sign back in. A second account should start empty.
6. On a phone-sized viewport, open import/export and navigate it using a keyboard where available.

## Record observations, not assumptions

| Tester  | Task | Completed unaided? | Where they paused | Exact feedback | Proposed change | Retest result |
| ------- | ---- | ------------------ | ----------------- | -------------- | --------------- | ------------- |
| Pending |      |                    |                   |                |                 |               |

Record approximate task duration only if actually timed. Keep tester contact details out of Git. Summarize findings anonymously. After three sessions, choose the two recurring issues with the clearest effect on task completion, fix them, and retest.
