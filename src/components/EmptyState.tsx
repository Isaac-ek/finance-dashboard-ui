import { SearchX } from "lucide-react";

export function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950/70">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-slate-900">
        <SearchX size={24} />
      </div>
      <h3 className="text-lg font-bold text-ink-950 dark:text-white">No matching transactions</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Try clearing the search, switching filters, or adding a new transaction if you are in admin mode.
      </p>
    </div>
  );
}
