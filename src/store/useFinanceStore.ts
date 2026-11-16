import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import mockTransactions from "../data/mockTransactions.json";
import { createDemoTransactions, isUnchangedDemo } from "../lib/demo";
import { dateKey, localDate, monthKey } from "../lib/dates";
import type {
  FilterType,
  FinanceFilters,
  SortKey,
  ThemeMode,
  Transaction,
  TransactionFormValues,
  UserRole,
} from "../types/finance";

interface FinanceState {
  transactions: Transaction[];
  role: UserRole;
  theme: ThemeMode;
  filters: FinanceFilters;
  reportMonth: string | null;
  seedDate: string;
  addTransaction: (values: TransactionFormValues) => void;
  updateTransaction: (id: string, values: TransactionFormValues) => void;
  deleteTransaction: (id: string) => void;
  restoreTransaction: (transaction: Transaction) => void;
  setRole: (role: UserRole) => void;
  setTheme: (theme: ThemeMode) => void;
  setReportMonth: (month: string) => void;
  setSearch: (search: string) => void;
  setFilterType: (type: FilterType) => void;
  setSortBy: (sortBy: SortKey) => void;
  resetFilters: () => void;
  resetDemo: () => void;
  refreshDemo: () => void;
}
const seed = mockTransactions as Transaction[];
const defaultFilters: FinanceFilters = {
  search: "",
  type: "all",
  sortBy: "date-desc",
};
export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      transactions: createDemoTransactions(seed),
      role: "admin",
      theme: "light",
      filters: defaultFilters,
      reportMonth: null,
      seedDate: dateKey(),
      addTransaction: (values) =>
        set((state) =>
          state.role === "admin"
            ? {
                transactions: [
                  { id: crypto.randomUUID(), ...values },
                  ...state.transactions,
                ],
              }
            : {},
        ),
      updateTransaction: (id, values) =>
        set((state) =>
          state.role === "admin"
            ? {
                transactions: state.transactions.map((item) =>
                  item.id === id ? { ...item, ...values } : item,
                ),
              }
            : {},
        ),
      deleteTransaction: (id) =>
        set((state) =>
          state.role === "admin"
            ? {
                transactions: state.transactions.filter(
                  (item) => item.id !== id,
                ),
              }
            : {},
        ),
      restoreTransaction: (transaction) =>
        set((state) =>
          state.role === "admin" &&
          !state.transactions.some((item) => item.id === transaction.id)
            ? { transactions: [transaction, ...state.transactions] }
            : {},
        ),
      setRole: (role) => set({ role }),
      setTheme: (theme) => set({ theme }),
      setReportMonth: (reportMonth) => set({ reportMonth }),
      setSearch: (search) =>
        set((state) => ({ filters: { ...state.filters, search } })),
      setFilterType: (type) =>
        set((state) => ({ filters: { ...state.filters, type } })),
      setSortBy: (sortBy) =>
        set((state) => ({ filters: { ...state.filters, sortBy } })),
      resetFilters: () => set({ filters: defaultFilters }),
      resetDemo: () =>
        set((state) =>
          state.role === "admin"
            ? {
                transactions: createDemoTransactions(seed),
                seedDate: dateKey(),
                reportMonth: null,
                filters: defaultFilters,
              }
            : {},
        ),
      refreshDemo: () =>
        set((state) => {
          if (state.seedDate.slice(0, 7) === monthKey()) return {};
          const oldSeed = createDemoTransactions(
            seed,
            localDate(state.seedDate),
          );
          if (!isUnchangedDemo(state.transactions, oldSeed)) return {};
          return {
            transactions: createDemoTransactions(seed),
            seedDate: dateKey(),
            reportMonth: null,
          };
        }),
    }),
    {
      name: "finance-dashboard-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        role: state.role,
        theme: state.theme,
        filters: state.filters,
        reportMonth: state.reportMonth,
        seedDate: state.seedDate,
      }),
      migrate: (persisted) => {
        const old = persisted as Partial<FinanceState>;
        const transactions = old.transactions || [];
        const pristine = isUnchangedDemo(transactions, seed);
        return {
          ...old,
          transactions: pristine ? createDemoTransactions(seed) : transactions,
          seedDate: pristine ? dateKey() : "2026-04-03",
          reportMonth: null,
        };
      },
      onRehydrateStorage: () => (state) => state?.refreshDemo(),
    },
  ),
);
