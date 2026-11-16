import type { Transaction, TransactionFormValues } from "../types/finance.ts";
import {
  transactionKey,
  validateTransaction,
  MAX_TRANSACTIONS,
} from "./transactions.ts";
export interface CsvTable {
  headers: string[];
  rows: string[][];
}
export interface Mapping {
  name: number;
  date: number;
  amount: number;
  category: number;
  type: number;
}
export type DateFormat = "iso" | "dmy" | "mdy";
export function parseCsv(text: string): CsvTable {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw new Error("Choose a CSV smaller than 2 MB.");
  text = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    endedQuote = false;
  const pushRow = () => {
    row.push(field);
    if (row.some((c) => c.trim())) records.push(row);
    row = [];
    field = "";
    endedQuote = false;
    if (records.length > 5001)
      throw new Error("Import up to 5,000 rows at a time.");
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          endedQuote = true;
        }
      } else field += c;
    } else if (c === '"') {
      if (field || endedQuote)
        throw new Error("Unexpected quote in CSV. Quote the entire field.");
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      endedQuote = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else {
      if (endedQuote)
        throw new Error("Unexpected characters after a quoted field.");
      field += c;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (field || row.length) pushRow();
  if (records.length < 2)
    throw new Error("CSV needs a header and at least one transaction.");
  const headers = records.shift()!.map((h) => h.trim());
  if (
    headers.some((h) => !h) ||
    new Set(headers.map((h) => h.toLowerCase())).size !== headers.length
  )
    throw new Error("Use nonempty, unique column headings.");
  if (headers.length > 30) throw new Error("CSV supports up to 30 columns.");
  return { headers, rows: records };
}
export function guessMapping(headers: string[]): Mapping {
  const find = (names: string[]) =>
    headers.findIndex((h) => names.includes(h.toLowerCase().trim()));
  return {
    name: find(["name", "description", "narration", "merchant"]),
    date: find(["date", "transaction date"]),
    amount: find(["amount", "value"]),
    category: find(["category"]),
    type: find(["type", "direction"]),
  };
}
export function previewCsv(
  table: CsvTable,
  mapping: Mapping,
  format: DateFormat,
  existing: Transaction[],
) {
  if ([mapping.name, mapping.date, mapping.amount].some((i) => i < 0))
    throw new Error("Map description, date and amount before importing.");
  const seen = new Set(existing.map(transactionKey));
  return table.rows.map((row, index) => {
    try {
      if (row.length !== table.headers.length)
        throw new Error("Column count does not match the header.");
      let date = row[mapping.date].trim();
      if (format !== "iso") {
        const parts = date.split(/[\/-]/);
        if (parts.length !== 3)
          throw new Error("Date does not match the selected format.");
        date = `${parts[2]}-${(format === "dmy" ? parts[1] : parts[0]).padStart(2, "0")}-${(format === "dmy" ? parts[0] : parts[1]).padStart(2, "0")}`;
      }
      let raw = row[mapping.amount].trim().replace(/^\$/, "");
      if (/^\(.*\)$/.test(raw)) raw = "-" + raw.slice(1, -1);
      if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw))
        throw new Error(
          "Amount needs a number with at most two decimal places.",
        );
      const amount = Number(raw.replace(/,/g, ""));
      const typeValue =
        mapping.type < 0
          ? amount < 0
            ? "expense"
            : "income"
          : row[mapping.type].trim().toLowerCase();
      const type = (
        {
          debit: "expense",
          credit: "income",
          expense: "expense",
          income: "income",
        } as Record<string, string>
      )[typeValue];
      if (!type)
        throw new Error("Type must be income/credit or expense/debit.");
      if (mapping.type >= 0 && amount < 0 && type === "income")
        throw new Error("Negative amount conflicts with income type.");
      const value = validateTransaction({
        name: row[mapping.name],
        date,
        amount: Math.abs(amount),
        type,
        category:
          mapping.category < 0 ? "Uncategorized" : row[mapping.category],
      });
      const key = transactionKey(value),
        duplicate = seen.has(key);
      seen.add(key);
      return { row: index + 2, value, duplicate, error: "" };
    } catch (error) {
      return {
        row: index + 2,
        value: null,
        duplicate: false,
        error: error instanceof Error ? error.message : "Invalid row.",
      };
    }
  });
}
function cell(value: string) {
  // Quoting alone does not prevent spreadsheet formula execution.
  if (/^[\s]*[=+\-@\t\r]/.test(value)) value = "'" + value;
  return '"' + value.replace(/"/g, '""') + '"';
}
export function exportCsv(transactions: Transaction[]) {
  return (
    "\uFEFF" +
    [
      "name,date,amount,category,type",
      ...transactions.map((t) =>
        [
          cell(t.name),
          cell(t.date),
          t.amount.toFixed(2),
          cell(t.category),
          t.type,
        ].join(","),
      ),
    ].join("\r\n")
  );
}
export function exportBackup(transactions: Transaction[]) {
  return JSON.stringify(
    {
      schema: "finance-backup",
      version: 1,
      currency: "USD",
      createdAt: new Date().toISOString(),
      transactions,
    },
    null,
    2,
  );
}
export function readBackup(text: string): TransactionFormValues[] {
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw new Error("Backup exceeds 8 MB.");
  const b = JSON.parse(text);
  if (
    b.schema !== "finance-backup" ||
    b.version !== 1 ||
    b.currency !== "USD" ||
    !Array.isArray(b.transactions) ||
    b.transactions.length > MAX_TRANSACTIONS
  )
    throw new Error(
      "Choose a supported Finance USD backup (up to 10,000 records).",
    );
  return b.transactions.map(validateTransaction);
}
export function downloadFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
