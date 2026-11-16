import { api, accountMode } from "../lib/api";
import {
  appendTransactions,
  validateTransaction,
  MAX_TRANSACTIONS,
} from "../lib/transactions";
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
  dataKind: "sample" | "personal";
  serverVersion: number;
  setAccountData: (data: {
    transactions: Transaction[];
    version: number;
  }) => void;
  clearAccount: () => void;
  importTransactions: (
    entries: TransactionFormValues[],
    skipDuplicates: boolean,
    replace?: boolean,
  ) => Promise<void>;
  restoreBackup: (entries: TransactionFormValues[]) => Promise<void>;
  addTransaction: (values: TransactionFormValues) => Promise<void>;
  updateTransaction: (
    id: string,
    values: TransactionFormValues,
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  restoreTransaction: (transaction: Transaction) => Promise<void>;
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
    (set, get) => {
      const write = async (path: string, method: string, body: object) => {
        const data = await api<{
          transactions: Transaction[];
          version: number;
        }>(path, method, { ...body, version: get().serverVersion });
        set({
          transactions: data.transactions,
          serverVersion: data.version,
          dataKind: "personal",
        });
      };
      const assertEditor = () => {
        if (get().role !== "admin")
          throw new Error("Read-only preview is selected.");
      };
      return {
        transactions: accountMode ? [] : createDemoTransactions(seed),
        role: "admin",
        theme: "light",
        filters: defaultFilters,
        reportMonth: null,
        seedDate: dateKey(),
        dataKind: "sample",
        serverVersion: 0,
        setAccountData: (data) =>
          set({
            transactions: data.transactions,
            serverVersion: data.version,
            dataKind: "personal",
            role: "admin",
          }),
        clearAccount: () =>
          set({
            transactions: [],
            serverVersion: 0,
            reportMonth: null,
            filters: defaultFilters,
          }),
        addTransaction: async (values) => {
          assertEditor();
          const value = validateTransaction(values);
          if (accountMode)
            await write("/transactions", "POST", { transaction: value });
          else {
            if (get().transactions.length >= MAX_TRANSACTIONS)
              throw new Error("Workspace supports up to 10,000 records.");
            set({
              transactions: [
                { id: crypto.randomUUID(), ...value },
                ...get().transactions,
              ],
              dataKind: "personal",
            });
          }
        },
        updateTransaction: async (id, values) => {
          assertEditor();
          const value = validateTransaction(values);
          if (accountMode)
            await write(`/transactions/${encodeURIComponent(id)}`, "PUT", {
              transaction: value,
            });
          else
            set({
              transactions: get().transactions.map((t) =>
                t.id === id ? { ...t, ...value } : t,
              ),
              dataKind: "personal",
            });
        },
        deleteTransaction: async (id) => {
          assertEditor();
          if (accountMode)
            await write(
              `/transactions/${encodeURIComponent(id)}`,
              "DELETE",
              {},
            );
          else
            set({
              transactions: get().transactions.filter((t) => t.id !== id),
              dataKind: "personal",
            });
        },
        restoreTransaction: async (transaction) => {
          assertEditor();
          if (accountMode)
            await write("/transactions", "POST", {
              transaction: validateTransaction(transaction),
            });
          else if (!get().transactions.some((t) => t.id === transaction.id))
            set({
              transactions: [transaction, ...get().transactions],
              dataKind: "personal",
            });
        },
        importTransactions: async (
          entries,
          skipDuplicates,
          replace = false,
        ) => {
          assertEditor();
          const next = appendTransactions(
            replace ? [] : get().transactions,
            entries,
            skipDuplicates,
          );
          if (accountMode) {
            if (replace)
              await write("/transactions/restore", "PUT", { entries: next });
            else
              await write("/transactions/import", "POST", {
                entries,
                skipDuplicates,
              });
          } else set({ transactions: next, dataKind: "personal" });
          set({ reportMonth: null, filters: defaultFilters });
        },
        restoreBackup: async (entries) => {
          assertEditor();
          const next = entries.map((v) => ({
            ...validateTransaction(v),
            id: crypto.randomUUID(),
          }));
          if (next.length > MAX_TRANSACTIONS)
            throw new Error("Backup exceeds 10,000 records.");
          if (accountMode)
            await write("/transactions/restore", "PUT", { entries });
          else set({ transactions: next, dataKind: "personal" });
          set({ reportMonth: null, filters: defaultFilters });
        },
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
            state.role === "admin" && !accountMode
              ? {
                  transactions: createDemoTransactions(seed),
                  dataKind: "sample",
                  seedDate: dateKey(),
                  reportMonth: null,
                  filters: defaultFilters,
                }
              : {},
          ),
        refreshDemo: () =>
          set((state) => {
            if (accountMode) return {};
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
      };
    },
    {
      name: accountMode
        ? "finance-account-preferences"
        : "finance-dashboard-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        accountMode
          ? { theme: state.theme }
          : {
              transactions: state.transactions,
              role: state.role,
              theme: state.theme,
              filters: state.filters,
              reportMonth: state.reportMonth,
              seedDate: state.seedDate,
              dataKind: state.dataKind,
            },
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
