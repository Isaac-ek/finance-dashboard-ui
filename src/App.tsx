import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { CategoryChart } from "./components/CategoryChart";
import { Header } from "./components/Header";
import { InsightsPanel } from "./components/InsightsPanel";
import { SummaryCard } from "./components/SummaryCard";
import { TransactionModal } from "./components/TransactionModal";
import { TransactionsTable } from "./components/TransactionsTable";
import { TrendChart } from "./components/TrendChart";
import {
  getCategoryBreakdown,
  getLastSixMonthsTrend,
  getMonthlyInsights,
  getSummary,
} from "./lib/analytics";
import {
  dateKey,
  formatMonth,
  latestMonth,
  localDate,
  monthKey,
  shiftMonth,
} from "./lib/dates";
import { useFinanceStore } from "./store/useFinanceStore";
import type { Transaction, TransactionFormValues } from "./types/finance";

export default function App() {
  const state = useFinanceStore();
  const { transactions, role, theme, filters } = state;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [message, setMessage] = useState("");
  const [deleted, setDeleted] = useState<Transaction | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const month = state.reportMonth || latestMonth(transactions);
  const latest = [monthKey(), latestMonth(transactions), month]
    .sort()
    .reverse()[0];
  const months = [
    ...new Set([
      month,
      ...transactions.map((item) => item.date.slice(0, 7)),
      ...Array.from({ length: 12 }, (_, index) => shiftMonth(latest, -index)),
    ]),
  ]
    .sort()
    .reverse();
  const period = transactions.filter((item) => item.date.slice(0, 7) === month);
  const summary = getSummary(period);
  const balance = getSummary(
    transactions.filter((item) => item.date.slice(0, 7) <= month),
  ).balance;
  const insights = getMonthlyInsights(transactions, month);
  const query = filters.search.trim().toLowerCase();
  const filtered = period
    .filter(
      (item) =>
        (!query ||
          `${item.name} ${item.category}`.toLowerCase().includes(query)) &&
        (filters.type === "all" || item.type === filters.type),
    )
    .sort((a, b) => {
      if (filters.sortBy === "amount-desc") return b.amount - a.amount;
      if (filters.sortBy === "amount-asc") return a.amount - b.amount;
      return filters.sortBy === "date-asc"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });
  const handleSubmit = (values: TransactionFormValues) => {
    if (role !== "admin") return;
    if (editing) state.updateTransaction(editing.id, values);
    else state.addTransaction(values);
    state.setReportMonth(values.date.slice(0, 7));
    state.resetFilters();
    setDeleted(null);
    setMessage(
      editing
        ? "Transaction updated. Overview refreshed."
        : "Transaction added. Overview refreshed.",
    );
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };
  const today = new Date();
  const selectedDate = localDate(month);
  const defaultDate =
    month === monthKey(today)
      ? dateKey(today)
      : dateKey(
          new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            Math.min(
              today.getDate(),
              new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + 1,
                0,
              ).getDate(),
            ),
          ),
        );

  return (
    <main className="app-shell">
      <Header
        role={role}
        theme={theme}
        month={month}
        months={months}
        onRoleChange={state.setRole}
        onThemeToggle={() =>
          state.setTheme(theme === "dark" ? "light" : "dark")
        }
        onMonthChange={state.setReportMonth}
        onAddTransaction={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      />
      <section className="summary-grid" aria-label="Financial summary">
        <SummaryCard
          title="Net balance"
          value={balance}
          note={`All entries through ${formatMonth(month)}`}
          icon={Wallet}
          accent="balance-card"
        />
        <SummaryCard
          title="Income"
          value={summary.income}
          note={`Received in ${formatMonth(month)}`}
          icon={ArrowDownLeft}
          accent="income-card"
        />
        <SummaryCard
          title="Expenses"
          value={summary.expenses}
          note={`Spent in ${formatMonth(month)}`}
          icon={ArrowUpRight}
          accent="expense-card"
        />
      </section>
      <div className="charts-grid">
        <div className="min-w-0">
          <TrendChart data={getLastSixMonthsTrend(transactions, month)} />
          <InsightsPanel month={month} {...insights} />
        </div>
        <CategoryChart data={getCategoryBreakdown(period)} />
      </div>
      <TransactionsTable
        transactions={filtered}
        totalCount={period.length}
        month={month}
        role={role}
        search={filters.search}
        typeFilter={filters.type}
        sortBy={filters.sortBy}
        onSearchChange={state.setSearch}
        onFilterChange={state.setFilterType}
        onSortChange={state.setSortBy}
        onReset={state.resetFilters}
        onEdit={(transaction) => {
          setEditing(transaction);
          setModalOpen(true);
        }}
        onDelete={(id) => {
          if (role !== "admin") return;
          const transaction = transactions.find((item) => item.id === id);
          if (!transaction) return;
          state.deleteTransaction(id);
          setDeleted(transaction);
          setMessage("Transaction deleted.");
        }}
      />
      <footer className="app-footer">
        <span>
          Fictional USD data. Editor and read-only modes are interface previews.
        </span>
        <div>
          <a
            href="https://ekezie-chiemelie.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Built by Chiemelie Ekezie ↗
          </a>
          <button
            className="text-button"
            disabled={role !== "admin"}
            onClick={() => {
              if (
                window.confirm(
                  "Replace this browser’s demo transactions with a fresh sample? Your edits will be cleared.",
                )
              ) {
                state.resetDemo();
                setDeleted(null);
                setMessage("Sample data reset.");
              }
            }}
          >
            Reset sample data
          </button>
        </div>
      </footer>
      {modalOpen && role === "admin" && (
        <TransactionModal
          key={editing?.id || "new"}
          initialValue={editing}
          defaultDate={defaultDate}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          {deleted && role === "admin" && (
            <button
              onClick={() => {
                state.restoreTransaction(deleted);
                state.setReportMonth(deleted.date.slice(0, 7));
                setDeleted(null);
                setMessage("Transaction restored.");
              }}
            >
              Undo
            </button>
          )}
          <button
            aria-label="Dismiss notification"
            onClick={() => {
              setMessage("");
              setDeleted(null);
            }}
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
