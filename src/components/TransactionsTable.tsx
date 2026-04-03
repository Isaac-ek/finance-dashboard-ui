import { Pencil, Search, Trash2 } from "lucide-react";
import type { FilterType, SortKey, Transaction, UserRole } from "../types/finance";
import { formatCurrency, formatDate } from "../lib/format";
import { EmptyState } from "./EmptyState";

interface TransactionsTableProps {
  transactions: Transaction[];
  role: UserRole;
  search: string;
  typeFilter: FilterType;
  sortBy: SortKey;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: FilterType) => void;
  onSortChange: (value: SortKey) => void;
  onReset: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionsTable({
  transactions,
  role,
  search,
  typeFilter,
  sortBy,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onReset,
  onEdit,
  onDelete
}: TransactionsTableProps) {
  return (
    <section className="panel animate-fade-up p-5">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink-950 dark:text-white">Transactions</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search, sort, and filter your income and expense activity.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_160px_180px_auto]">
          <label className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by name or category"
              className="input-base pl-10"
            />
          </label>

          <select
            className="input-base"
            value={typeFilter}
            onChange={(event) => onFilterChange(event.target.value as FilterType)}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            className="input-base"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>

          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Reset
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/80">
                <tr className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  {role === "admin" && <th className="px-5 py-4 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900/60">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-950/60">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{transaction.name}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          transaction.type === "income"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-4 text-sm font-bold ${
                        transaction.type === "income"
                          ? "text-accent-600"
                          : "text-coral-500 dark:text-orange-300"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                    {role === "admin" && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(transaction)}
                            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(transaction.id)}
                            className="rounded-2xl border border-rose-200 p-2 text-rose-500 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
