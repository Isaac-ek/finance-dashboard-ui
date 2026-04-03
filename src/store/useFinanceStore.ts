import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import mockTransactions from "../data/mockTransactions.json";
import type {
  FilterType,
  FinanceFilters,
  SortKey,
  ThemeMode,
  Transaction,
  TransactionFormValues,
  UserRole
} from "../types/finance";

interface FinanceState {
  transactions: Transaction[];
  role: UserRole;
  theme: ThemeMode;
  filters: FinanceFilters;
  addTransaction: (values: TransactionFormValues) => void;
  updateTransaction: (id: string, values: TransactionFormValues) => void;
  deleteTransaction: (id: string) => void;
  setRole: (role: UserRole) => void;
  setTheme: (theme: ThemeMode) => void;
  setSearch: (search: string) => void;
  setFilterType: (type: FilterType) => void;
  setSortBy: (sortBy: SortKey) => void;
  resetFilters: () => void;
}

const defaultFilters: FinanceFilters = {
  search: "",
  type: "all",
  sortBy: "date-desc"
};

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      transactions: mockTransactions as Transaction[],
      role: "viewer",
      theme: "light",
      filters: defaultFilters,
      addTransaction: (values) =>
        set((state) => ({
          transactions: [
            {
              id: crypto.randomUUID(),
              ...values
            },
            ...state.transactions
          ]
        })),
      updateTransaction: (id, values) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id ? { ...transaction, ...values } : transaction,
          )
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((transaction) => transaction.id !== id)
        })),
      setRole: (role) => set({ role }),
      setTheme: (theme) => set({ theme }),
      setSearch: (search) =>
        set((state) => ({
          filters: { ...state.filters, search }
        })),
      setFilterType: (type) =>
        set((state) => ({
          filters: { ...state.filters, type }
        })),
      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy }
        })),
      resetFilters: () => set({ filters: defaultFilters })
    }),
    {
      name: "finance-dashboard-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        role: state.role,
        theme: state.theme,
        filters: state.filters
      })
    },
  ),
);
