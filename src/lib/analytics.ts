import type { Transaction } from "../types/finance";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getLastSixMonthsTrend(transactions: Transaction[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      label: date.toLocaleDateString("en-US", { month: "short" }),
      income: 0,
      expenses: 0,
      balance: 0
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));

  transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.date);
    const key = monthKey(transactionDate);
    const bucket = monthMap.get(key);

    if (!bucket) {
      return;
    }

    if (transaction.type === "income") {
      bucket.income += transaction.amount;
    } else {
      bucket.expenses += transaction.amount;
    }

    bucket.balance = bucket.income - bucket.expenses;
  });

  return months;
}

export function getCategoryBreakdown(transactions: Transaction[]) {
  const categories = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      categories.set(
        transaction.category,
        (categories.get(transaction.category) ?? 0) + transaction.amount,
      );
    });

  return Array.from(categories.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function getSummary(transactions: Transaction[]) {
  return transactions.reduce(
    (accumulator, transaction) => {
      if (transaction.type === "income") {
        accumulator.income += transaction.amount;
      } else {
        accumulator.expenses += transaction.amount;
      }

      accumulator.balance = accumulator.income - accumulator.expenses;
      return accumulator;
    },
    { balance: 0, income: 0, expenses: 0 },
  );
}

export function getMonthlyInsights(transactions: Transaction[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const previousMonth = previousMonthDate.getMonth();
  const previousYear = previousMonthDate.getFullYear();

  const currentMonthExpenses = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return (
      transaction.type === "expense" &&
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear
    );
  });

  const previousMonthExpenses = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return (
      transaction.type === "expense" &&
      date.getMonth() === previousMonth &&
      date.getFullYear() === previousYear
    );
  });

  const categoryTotals = getCategoryBreakdown(currentMonthExpenses);
  const highestCategory = categoryTotals[0];

  const currentTotal = currentMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const previousTotal = previousMonthExpenses.reduce((sum, item) => sum + item.amount, 0);

  const comparison =
    previousTotal === 0
      ? 0
      : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);

  return {
    highestCategory: highestCategory?.name ?? "No expense data",
    highestCategoryValue: highestCategory?.value ?? 0,
    currentTotal,
    previousTotal,
    comparison
  };
}
