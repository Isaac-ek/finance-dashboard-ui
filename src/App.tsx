import { AccountGate } from "./components/AccountGate";
import { api, accountMode, type AccountUser } from "./lib/api";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

const DataDialog = lazy(() =>
  import("./components/DataDialog").then((m) => ({ default: m.DataDialog })),
);

export default function App() {
  const state = useFinanceStore();
  const { transactions, role, theme, filters } = state;
  const [user, setUser] = useState<AccountUser | null>(null);
  const [checking, setChecking] = useState(accountMode);
  const [connectionError, setConnectionError] = useState("");
  const dataTrigger = useRef<HTMLButtonElement>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [message, setMessage] = useState("");
  const [deleted, setDeleted] = useState<Transaction | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setAccountData = state.setAccountData,
    clearAccount = state.clearAccount;
  const loadAccount = useCallback(
    async (nextUser: AccountUser) => {
      const data = await api<{ transactions: Transaction[]; version: number }>(
        "/transactions",
      );
      setAccountData(data);
      setUser(nextUser);
      setConnectionError("");
    },
    [setAccountData],
  );
  useEffect(() => {
    if (!accountMode) return;
    let active = true;
    const expired = () => {
      clearAccount();
      setUser(null);
      setDataOpen(false);
      setModalOpen(false);
      setDeleted(null);
      setMessage("");
    };
    window.addEventListener("finance-session-expired", expired);
    api<{ user: AccountUser }>("/auth/me")
      .then(async (r) => {
        const data = await api<{
          transactions: Transaction[];
          version: number;
        }>("/transactions");
        if (active) {
          setAccountData(data);
          setUser(r.user);
          setConnectionError("");
        }
      })
      .catch((e) => {
        if (active && !String(e.message).includes("Sign in"))
          setConnectionError(
            "Cannot reach the local account server. Start npm run server, then reload.",
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      window.removeEventListener("finance-session-expired", expired);
    };
  }, [setAccountData, clearAccount]);
  if (checking)
    return (
      <main className="account-shell">
        <p role="status">Opening your local workspace…</p>
      </main>
    );
  if (accountMode && !user)
    return (
      <>
        {connectionError && (
          <div className="connection-error" role="alert">
            {connectionError}
          </div>
        )}
        <AccountGate onSignedIn={loadAccount} />
      </>
    );

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
  const handleSubmit = async (values: TransactionFormValues) => {
    if (role !== "admin") return;
    if (editing) await state.updateTransaction(editing.id, values);
    else await state.addTransaction(values);
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
        accountEmail={user?.email}
        personalData={state.dataKind === "personal"}
        onSignOut={async () => {
          try {
            await api("/auth/logout", "POST", {});
            state.clearAccount();
            setUser(null);
            setMessage("");
            setDeleted(null);
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Sign out failed.");
          }
        }}
        onReload={
          accountMode
            ? async () => {
                try {
                  await loadAccount(user!);
                  setMessage("Latest records loaded.");
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : "Reload failed.");
                }
              }
            : undefined
        }
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
      <div className="data-toolbar">
        <p>
          {accountMode
            ? "Saved to your local account."
            : "Import your own USD records or keep exploring the sample."}
        </p>
        <button
          ref={dataTrigger}
          className="secondary-button"
          onClick={() => setDataOpen(true)}
        >
          Import & export
        </button>
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
        onDelete={async (id) => {
          if (role !== "admin") return;
          const transaction = transactions.find((item) => item.id === id);
          if (!transaction) return;
          try {
            await state.deleteTransaction(id);
            setDeleted(transaction);
            setMessage("Transaction deleted.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Delete failed.");
          }
        }}
      />
      <footer className="app-footer">
        <span>
          {accountMode
            ? "USD records saved on this computer’s local server. No bank connection."
            : "Browser-local USD records. Access modes are interface previews; no bank connection."}
        </span>
        <div>
          <a
            href="https://ekezie-chiemelie.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Built by Chiemelie Ekezie ↗
          </a>
          {!accountMode && (
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
          )}
        </div>
      </footer>
      {dataOpen && (
        <Suspense fallback={<p role="status">Opening import tools…</p>}>
          <DataDialog
            returnFocus={dataTrigger.current}
            onClose={() => setDataOpen(false)}
            onDone={(message) => {
              setDataOpen(false);
              setMessage(message);
              setDeleted(null);
            }}
          />
        </Suspense>
      )}
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
              onClick={async () => {
                try {
                  await state.restoreTransaction(deleted);
                  state.setReportMonth(deleted.date.slice(0, 7));
                  setDeleted(null);
                  setMessage("Transaction restored.");
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : "Restore failed.",
                  );
                }
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
