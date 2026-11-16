import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getSummary,
  getLastSixMonthsTrend,
  getMonthlyInsights,
  getCategoryBreakdown,
} from "../src/lib/analytics.ts";
import { createDemoTransactions, isUnchangedDemo } from "../src/lib/demo.ts";
import {
  dateKey,
  latestMonth,
  localDate,
  monthKey,
  shiftMonth,
} from "../src/lib/dates.ts";
import type { Transaction } from "../src/types/finance.ts";
const seed: Transaction[] = JSON.parse(
  readFileSync(
    new URL("../src/data/mockTransactions.json", import.meta.url),
    "utf8",
  ),
);
const item = (
  id: string,
  amount: number,
  date = "2026-01-01",
  type: "income" | "expense" = "expense",
  category = "Food",
): Transaction => ({ id, name: id, amount, date, type, category });

test("date-only values retain their calendar month without a UTC shift", () => {
  assert.equal(monthKey(localDate("2026-01-01")), "2026-01");
  assert.equal(dateKey(localDate("2026-01-01")), "2026-01-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2025-12", 1), "2026-01");
});
test("fictional seeds stay within the most recent six months in future years", () => {
  for (const date of ["2026-11-16", "2030-01-01", "2032-02-29"]) {
    const now = localDate(date);
    const demo = createDemoTransactions(seed, now);
    assert.equal(latestMonth(demo), date.slice(0, 7));
    assert.ok(demo.every((t) => t.date <= date));
    const trend = getLastSixMonthsTrend(demo, date.slice(0, 7));
    assert.equal(trend.length, 6);
    assert.ok(trend.every((t) => t.income + t.expenses > 0));
    assert.equal(
      trend.reduce((sum, t) => sum + t.income, 0),
      getSummary(demo).income,
    );
    assert.ok(getMonthlyInsights(demo, date.slice(0, 7)).currentTotal > 0);
  }
});
test("month-end seed dates are clamped rather than rolling into March", () => {
  const demo = createDemoTransactions(
    [item("a", 10, "2026-01-31")],
    localDate("2026-02-28"),
  );
  assert.equal(demo[0].date, "2026-02-28");
});
test("untouched data is recognized but visitor edits and duplicate IDs are preserved", () => {
  assert.equal(isUnchangedDemo([...seed].reverse(), seed), true);
  const edited = seed.map((x, i) =>
    i === 0 ? { ...x, amount: x.amount + 1 } : x,
  );
  assert.equal(isUnchangedDemo(edited, seed), false);
  assert.equal(isUnchangedDemo(seed.slice(1), seed), false);
  assert.equal(
    isUnchangedDemo(
      seed.map(() => seed[0]),
      seed,
    ),
    false,
  );
});
test("decimal amounts are summed as cents for balance and categories", () => {
  const records = [
    item("a", 0.1, undefined, "income"),
    item("b", 0.2, undefined, "income"),
    item("c", 0.1),
  ];
  assert.deepEqual(getSummary(records), {
    income: 0.3,
    expenses: 0.1,
    balance: 0.2,
  });
  assert.deepEqual(getCategoryBreakdown([item("a", 0.1), item("b", 0.2)]), [
    { name: "Food", value: 0.3 },
  ]);
});
test("trend follows the selected reporting period, including year boundaries", () => {
  const records = [
    item("dec", 100, "2025-12-31"),
    item("jan", 20),
    item("later", 900, "2026-02-01"),
  ];
  const trend = getLastSixMonthsTrend(records, "2026-01");
  assert.equal(trend[0].key, "2025-08");
  assert.equal(trend[4].expenses, 100);
  assert.equal(trend[5].expenses, 20);
});
test("monthly insights compare January against December and exclude other months", () => {
  const result = getMonthlyInsights(
    [
      item("last", 100, "2025-12-01"),
      item("now", 125),
      item("later", 900, "2026-02-01"),
    ],
    "2026-01",
  );
  assert.equal(result.currentTotal, 125);
  assert.equal(result.previousTotal, 100);
  assert.equal(result.comparison, 25);
  assert.equal(result.highestCategory, "Food");
});
test("zero baseline does not invent a zero-percent decrease", () => {
  assert.equal(getMonthlyInsights([item("a", 25)], "2026-01").comparison, null);
  assert.equal(getMonthlyInsights([], "2026-01").comparison, null);
  assert.equal(
    getMonthlyInsights([item("a", 25, "2025-12-01"), item("b", 25)], "2026-01")
      .comparison,
    0,
  );
});
test("empty months retain zero totals and never reuse a previous category", () => {
  const insights = getMonthlyInsights([item("a", 30, "2025-12-01")], "2026-01");
  assert.equal(insights.currentTotal, 0);
  assert.equal(insights.highestCategory, "No expenses recorded");
  assert.equal(insights.comparison, -100);
});
