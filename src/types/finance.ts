export type TransactionType = "income" | "expense";
export type UserRole = "viewer" | "admin";
export type ThemeMode = "light" | "dark";
export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
export type FilterType = "all" | TransactionType;

export interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
}

export interface TransactionFormValues {
  name: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
}

export interface FinanceFilters {
  search: string;
  type: FilterType;
  sortBy: SortKey;
}
