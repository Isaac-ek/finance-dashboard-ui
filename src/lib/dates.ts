export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day || 1);
}

export function dateKey(date = new Date()) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftMonth(month: string, offset: number) {
  const date = localDate(month);
  return monthKey(new Date(date.getFullYear(), date.getMonth() + offset, 1));
}

export function formatMonth(month: string) {
  return localDate(month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function latestMonth(
  transactions: { date: string }[],
  fallback = monthKey(),
) {
  return (
    transactions.reduce(
      (latest, item) =>
        item.date.slice(0, 7) > latest ? item.date.slice(0, 7) : latest,
      "",
    ) || fallback
  );
}
