import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { CategoryChart } from "./components/CategoryChart";
import { Header } from "./components/Header";
import { InsightsPanel } from "./components/InsightsPanel";
import { SummaryCard } from "./components/SummaryCard";
import { TransactionModal } from "./components/TransactionModal";
import { TransactionsTable } from "./components/TransactionsTable";
import { TrendChart } from "./components/TrendChart";
import { getCategoryBreakdown, getLastSixMonthsTrend, getMonthlyInsights, getSummary } from "./lib/analytics";
import { useFinanceStore } from "./store/useFinanceStore";
import type { Transaction, TransactionFormValues } from "./types/finance";

function getFilteredTransactions(
  transactions: Transaction[],
  search: string,
  typeFilter: "all" | "income" | "expense",
  sortBy: "date-desc" | "date-asc" | "amount-desc" | "amount-asc",
) {
  const normalizedSearch = search.trim().toLowerCase();

  return [...transactions]
    .filter((transaction) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        transaction.name.toLowerCase().includes(normalizedSearch) ||
        transaction.category.toLowerCase().includes(normalizedSearch);

      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((left, right) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(left.date).getTime() - new Date(right.date).getTime();
        case "amount-desc":
          return right.amount - left.amount;
        case "amount-asc":
          return left.amount - right.amount;
        case "date-desc":
        default:
          return new Date(right.date).getTime() - new Date(left.date).getTime();
      }
    });
}

export default function App() {
  const {
    transactions,
    role,
    theme,
    filters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setRole,
    setTheme,
    setSearch,
    setFilterType,
    setSortBy,
    resetFilters
  } = useFinanceStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const summary = getSummary(transactions);
  const trendData = getLastSixMonthsTrend(transactions);
  const categoryData = getCategoryBreakdown(transactions);
  const insights = getMonthlyInsights(transactions);
  const filteredTransactions = getFilteredTransactions(
    transactions,
    filters.search,
    filters.type,
    filters.sortBy,
  );

  const handleSubmit = (values: TransactionFormValues) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, values);
      setEditingTransaction(null);
      return;
    }

    addTransaction(values);
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 transition-colors duration-300 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Header
          role={role}
          theme={theme}
          onRoleChange={setRole}
          onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          onAddTransaction={() => {
            setEditingTransaction(null);
            setModalOpen(true);
          }}
        />

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Balance"
            value={summary.balance}
            note="Net position across income and expenses."
            icon={Wallet}
            accent="bg-gradient-to-br from-ink-950 to-slate-700"
          />
          <SummaryCard
            title="Total Income"
            value={summary.income}
            note="All income entries across the mock dataset."
            icon={ArrowUpCircle}
            accent="bg-gradient-to-br from-accent-600 to-emerald-400"
          />
          <SummaryCard
            title="Total Expenses"
            value={summary.expenses}
            note="Combined spend across all tracked categories."
            icon={ArrowDownCircle}
            accent="bg-gradient-to-br from-coral-500 to-amber-400"
          />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
          <TrendChart data={trendData} />
          <InsightsPanel {...insights} />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <TransactionsTable
            transactions={filteredTransactions}
            role={role}
            search={filters.search}
            typeFilter={filters.type}
            sortBy={filters.sortBy}
            onSearchChange={setSearch}
            onFilterChange={setFilterType}
            onSortChange={setSortBy}
            onReset={resetFilters}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setModalOpen(true);
            }}
            onDelete={deleteTransaction}
          />
          <CategoryChart data={categoryData} />
        </section>
      </div>

      <TransactionModal
        open={modalOpen}
        initialValue={editingTransaction}
        onClose={() => {
          setModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
