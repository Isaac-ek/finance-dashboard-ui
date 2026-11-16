import type { Transaction } from "../types/finance";
import { localDate, monthKey } from "./dates.ts";

// Rebase only fictional seed data, never the visitor's edited transactions.
export function createDemoTransactions(
  seed: Transaction[],
  today = new Date(),
): Transaction[] {
  const last = seed.reduce(
    (latest, item) => (item.date > latest ? item.date : latest),
    "",
  );
  const anchor = localDate(last);
  const offset =
    (today.getFullYear() - anchor.getFullYear()) * 12 +
    today.getMonth() -
    anchor.getMonth();
  return seed.map((item) => {
    const original = localDate(item.date);
    const shifted = new Date(
      original.getFullYear(),
      original.getMonth() + offset,
      1,
    );
    const lastDay = new Date(
      shifted.getFullYear(),
      shifted.getMonth() + 1,
      0,
    ).getDate();
    const cap =
      monthKey(shifted) === monthKey(today) ? today.getDate() : lastDay;
    return {
      ...item,
      date: `${monthKey(shifted)}-${String(Math.min(original.getDate(), cap, lastDay)).padStart(2, "0")}`,
    };
  });
}

export function isUnchangedDemo(
  transactions: Transaction[],
  seed: Transaction[],
) {
  if (
    transactions.length !== seed.length ||
    new Set(transactions.map((item) => item.id)).size !== seed.length
  )
    return false;
  const originals = new Map(seed.map((item) => [item.id, item]));
  return transactions.every((item) => {
    const original = originals.get(item.id);
    return (
      original &&
      ["name", "date", "amount", "category", "type"].every(
        (key) =>
          item[key as keyof Transaction] === original[key as keyof Transaction],
      )
    );
  });
}
