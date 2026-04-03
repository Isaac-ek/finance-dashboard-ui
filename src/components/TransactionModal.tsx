import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Transaction, TransactionFormValues } from "../types/finance";

interface TransactionModalProps {
  open: boolean;
  initialValue?: Transaction | null;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => void;
}

const defaultValues: TransactionFormValues = {
  name: "",
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  category: "Food",
  type: "expense"
};

const categories = [
  "Salary",
  "Housing",
  "Food",
  "Transport",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Travel",
  "Side Hustle",
  "Investments",
  "Bonus",
  "Education"
];

export function TransactionModal({
  open,
  initialValue,
  onClose,
  onSubmit
}: TransactionModalProps) {
  const [values, setValues] = useState<TransactionFormValues>(defaultValues);

  useEffect(() => {
    if (initialValue) {
      setValues({
        name: initialValue.name,
        date: initialValue.date,
        amount: initialValue.amount,
        category: initialValue.category,
        type: initialValue.type
      });
      return;
    }

    setValues(defaultValues);
  }, [initialValue, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="panel animate-pop-in w-full max-w-xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-ink-950 dark:text-white">
              {initialValue ? "Edit transaction" : "Add transaction"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Update the global mock dataset instantly through the Zustand store.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(values);
            onClose();
          }}
        >
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Name</span>
            <input
              className="input-base"
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              placeholder="Client payment"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Date</span>
            <input
              type="date"
              className="input-base"
              value={values.date}
              onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Amount</span>
            <input
              type="number"
              min="1"
              className="input-base"
              value={values.amount}
              onChange={(event) =>
                setValues((current) => ({ ...current, amount: Number(event.target.value) }))
              }
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Category</span>
            <select
              className="input-base"
              value={values.category}
              onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Type</span>
            <select
              className="input-base"
              value={values.type}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  type: event.target.value as TransactionFormValues["type"]
                }))
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-ink-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-accent-600 dark:hover:bg-accent-500"
            >
              {initialValue ? "Save Changes" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
