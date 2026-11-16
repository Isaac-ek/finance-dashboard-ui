import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, guessMapping, previewCsv, exportCsv, exportBackup, readBackup } from "../src/lib/csv.ts";
import { appendTransactions, validateTransaction } from "../src/lib/transactions.ts";
const tx = { id: 'old', name: 'Groceries', date: '2026-11-16', amount: 23.45, category: 'Food', type: 'expense' as const };
test('CSV handles BOM, CRLF, escaped quotes, embedded commas and newlines', () => {
  const t = parseCsv('\uFEFFdescription,date,amount\r\n"Shop, \"\"branch\"\"\nWest",2026-11-16,-23.45\r\n');
  assert.equal(t.rows[0][0], 'Shop, "branch"\nWest');
  const p = previewCsv(t, guessMapping(t.headers), 'iso', []);
  assert.equal(p[0].value?.amount, 23.45); assert.equal(p[0].value?.type, 'expense');
});
test('malformed CSV, duplicate headings and unclosed quotes are rejected', () => {
  for (const csv of ['name,name\na,b', 'name,date\n"unfinished,x', 'name,date\n"a"junk,x', 'name,date\na"b,x']) assert.throws(() => parseCsv(csv));
});
test('dates, zero, excessive precision, mismatched rows and currency symbols fail preview', () => {
  for (const row of ['x,2026-02-30,1', 'x,2026-11-16,0', 'x,2026-11-16,1.234', 'x,2026-11-16,₦20', 'x,2026-11-16,20,extra']) {
    const t = parseCsv('name,date,amount\n' + row);
    assert.ok(previewCsv(t, guessMapping(t.headers), 'iso', [])[0].error);
  }
});
test('DMY and signed amounts map predictably; explicit type conflicts are reported', () => {
  const t = parseCsv('description,date,amount,type\nRent,16/11/2026,"1,200.00",debit\nSalary,16/11/2026,-50,income');
  const p = previewCsv(t, guessMapping(t.headers), 'dmy', []);
  assert.equal(p[0].value?.date, '2026-11-16'); assert.equal(p[0].value?.amount, 1200); assert.ok(p[1].error);
});
test('duplicates include existing records and repeated incoming rows; intentional duplicates can be kept', () => {
  const t = parseCsv('name,date,amount,category,type\nGroceries,2026-11-16,23.45,Food,expense\nGroceries,2026-11-16,23.45,Food,expense');
  assert.equal(previewCsv(t, guessMapping(t.headers), 'iso', [tx]).filter(r => r.duplicate).length, 2);
  assert.equal(appendTransactions([tx], [tx, tx], true).length, 1);
  assert.equal(appendTransactions([tx], [tx, tx], false).length, 3);
});
test('CSV export quotes text and neutralizes spreadsheet formulas', () => {
  const csv = exportCsv([{ ...tx, name: '=SUM(A1:A5)', category: '+formula' }]);
  assert.ok(csv.includes('"\'=SUM(A1:A5)"')); assert.ok(csv.includes('"\'+formula"'));
  assert.equal(parseCsv(exportCsv([tx])).rows[0][0], tx.name);
});
test('backup roundtrip preserves financial fields and rejects unsupported or invalid data', () => {
  const [restored] = readBackup(exportBackup([tx]));
  assert.deepEqual(restored, validateTransaction(tx));
  assert.throws(() => readBackup(JSON.stringify({ schema:'finance-backup', version:1, currency:'NGN', transactions:[tx] })));
  assert.throws(() => readBackup(exportBackup([{ ...tx, amount: -1 }])));
});
