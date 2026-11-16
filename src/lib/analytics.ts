import type { Transaction } from "../types/finance";
import { formatMonth, localDate, monthKey, shiftMonth } from "./dates.ts";

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);
const total = (items: Transaction[]) =>
  items.reduce((sum, item) => sum + cents(item.amount), 0) / 100;

export function getLastSixMonthsTrend(
  transactions: Transaction[],
  endMonth = monthKey(),
) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonth(endMonth, index - 5);
    return {
      key,
      label: localDate(key).toLocaleDateString("en-US", { month: "short" }),
      fullLabel: formatMonth(key),
      income: 0,
      expenses: 0,
      balance: 0,
    };
  });
  for (const month of months) {
    const entries = transactions.filter(
      (item) => item.date.slice(0, 7) === month.key,
    );
    month.income = total(entries.filter((item) => item.type === "income"));
    month.expenses = total(entries.filter((item) => item.type === "expense"));
    month.balance = (cents(month.income) - cents(month.expenses)) / 100;
  }
  return months;
}

export function getCategoryBreakdown(transactions: Transaction[]) {
  const categories = new Map<string, number>();
  for (const item of transactions)
    if (item.type === "expense") {
      categories.set(
        item.category,
        (categories.get(item.category) || 0) + cents(item.amount),
      );
    }
  return Array.from(categories, ([name, value]) => ({
    name,
    value: value / 100,
  })).sort((a, b) => b.value - a.value);
}

export function getSummary(transactions: Transaction[]) {
  const income = total(transactions.filter((item) => item.type === "income"));
  const expenses = total(
    transactions.filter((item) => item.type === "expense"),
  );
  return { income, expenses, balance: (cents(income) - cents(expenses)) / 100 };
}

export function getMonthlyInsights(
  transactions: Transaction[],
  selectedMonth = monthKey(),
) {
  const previousMonth = shiftMonth(selectedMonth, -1);
  const expenses = transactions.filter((item) => item.type === "expense");
  const current = expenses.filter(
    (item) => item.date.slice(0, 7) === selectedMonth,
  );
  const previous = expenses.filter(
    (item) => item.date.slice(0, 7) === previousMonth,
  );
  const highest = getCategoryBreakdown(current)[0];
  const currentTotal = total(current),
    previousTotal = total(previous);
  return {
    highestCategory: highest?.name || "No expenses recorded",
    highestCategoryValue: highest?.value || 0,
    currentTotal,
    previousTotal,
    // A zero baseline cannot support a percentage comparison.
    comparison:
      previousTotal === 0
        ? null
        : Math.round(((currentTotal - previousTotal) / previousTotal) * 100),
  };
}
