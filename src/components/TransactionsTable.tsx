import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pencil, Search, Trash2 } from "lucide-react";
import type {
  FilterType,
  SortKey,
  Transaction,
  UserRole,
} from "../types/finance";
import { formatCurrency, formatDate } from "../lib/format";
import { formatMonth } from "../lib/dates";
import { EmptyState } from "./EmptyState";
interface Props {
  transactions: Transaction[];
  totalCount: number;
  month: string;
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
  totalCount,
  month,
  role,
  search,
  typeFilter,
  sortBy,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onReset,
  onEdit,
  onDelete,
}: Props) {
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, sortBy, month]);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(transactions.length / 10) - 1),
  );
  const rows = transactions.slice(currentPage * 10, (currentPage + 1) * 10);
  return (
    <section className="panel table-panel" aria-labelledby="transactions-title">
      <div className="table-heading">
        <div>
          <p className="eyebrow">THE DETAILS</p>
          <h2 id="transactions-title">Transactions</h2>
          <p>{formatMonth(month)} · Search and filters apply to this list.</p>
        </div>
        <span className="transaction-count">
          {transactions.length} of {totalCount} entries
        </span>
      </div>
      <div className="table-tools">
        <label className="search-field">
          <span className="sr-only">Search transactions</span>
          <Search size={16} aria-hidden="true" />
          <input
            className="input-base"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or category"
          />
        </label>
        <label>
          <span className="sr-only">Transaction type</span>
          <select
            className="input-base"
            value={typeFilter}
            onChange={(e) => onFilterChange(e.target.value as FilterType)}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort transactions</span>
          <select
            className="input-base"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
        </label>
        <button className="secondary-button" onClick={onReset}>
          Clear filters
        </button>
      </div>
      {rows.length ? (
        <>
          <div className="table-wrap">
            <table className="transactions-table">
              <caption className="sr-only">
                Transactions for {formatMonth(month)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Transaction</th>
                  <th scope="col" className="desktop-detail">
                    Date
                  </th>
                  <th scope="col" className="desktop-detail">
                    Category
                  </th>
                  <th scope="col" className="desktop-detail">
                    Type
                  </th>
                  <th scope="col" className="amount-cell">
                    Amount
                  </th>
                  {role === "admin" && (
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="transaction-name">{item.name}</span>
                      <span className="mobile-detail">
                        {formatDate(item.date)} · {item.category}
                      </span>
                    </td>
                    <td className="desktop-detail">{formatDate(item.date)}</td>
                    <td className="desktop-detail">{item.category}</td>
                    <td className="desktop-detail">
                      <span className={`type-label ${item.type}`}>
                        {item.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className={`amount-cell ${item.type}`}>
                      {item.type === "income" ? "+" : "−"}
                      {formatCurrency(item.amount)}
                    </td>
                    {role === "admin" && (
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => onEdit(item)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${item.name}`}
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              Showing {currentPage * 10 + 1}–
              {Math.min((currentPage + 1) * 10, transactions.length)} of{" "}
              {transactions.length}
            </span>
            {transactions.length > 10 && (
              <div>
                <button
                  className="secondary-button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ArrowLeft size={13} />
                  Previous
                </button>
                <button
                  className="secondary-button"
                  disabled={(currentPage + 1) * 10 >= transactions.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}
