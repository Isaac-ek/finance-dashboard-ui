import type { Transaction, TransactionFormValues } from "../types/finance.ts";
export const MAX_TRANSACTIONS = 10000;
export function validateTransaction(value: unknown): TransactionFormValues {
  if (!value || typeof value !== "object")
    throw new Error("Expected a transaction.");
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || !v.name.trim() || v.name.length > 100)
    throw new Error("Description must contain 1–100 characters.");
  if (
    typeof v.category !== "string" ||
    !v.category.trim() ||
    v.category.length > 60
  )
    throw new Error("Category must contain 1–60 characters.");
  if (v.type !== "income" && v.type !== "expense")
    throw new Error("Type must be income or expense.");
  if (
    typeof v.amount !== "number" ||
    !Number.isFinite(v.amount) ||
    v.amount <= 0 ||
    v.amount > 1000000000 ||
    Math.abs(v.amount * 100 - Math.round(v.amount * 100)) > 0.0001
  )
    throw new Error(
      "Amount must be positive, at most 1 billion USD, with at most two decimal places.",
    );
  if (
    typeof v.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.date) ||
    v.date.slice(0, 4) < "1900" ||
    v.date.slice(0, 4) > "2100" ||
    new Date(v.date + "T12:00:00Z").toISOString().slice(0, 10) !== v.date
  )
    throw new Error("Use a real calendar date between 1900 and 2100.");
  return {
    name: v.name.trim(),
    category: v.category.trim(),
    type: v.type,
    amount: Math.round(v.amount * 100) / 100,
    date: v.date,
  };
}
export function transactionKey(t: TransactionFormValues) {
  return JSON.stringify([
    t.date,
    t.name.trim().replace(/\s+/g, " ").toLowerCase(),
    Math.round(t.amount * 100),
    t.type,
    t.category.trim().toLowerCase(),
  ]);
}
export function appendTransactions(
  current: Transaction[],
  entries: TransactionFormValues[],
  skipDuplicates: boolean,
): Transaction[] {
  const seen = new Set(current.map(transactionKey));
  const next = [...current];
  for (const value of entries) {
    const t = validateTransaction(value),
      key = transactionKey(t);
    if (skipDuplicates && seen.has(key)) continue;
    seen.add(key);
    next.push({ ...t, id: crypto.randomUUID() });
  }
  if (next.length > MAX_TRANSACTIONS)
    throw new Error("A workspace supports up to 10,000 transactions.");
  return next;
}
