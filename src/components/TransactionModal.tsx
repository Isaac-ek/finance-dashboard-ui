import { useEffect, useRef, useState } from "react";
import { accountMode } from "../lib/api";
import { X } from "lucide-react";
import type {
  Transaction,
  TransactionFormValues,
  TransactionType,
} from "../types/finance";
interface Props {
  initialValue?: Transaction | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
}
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
  "Education",
];
export function TransactionModal({
  initialValue,
  defaultDate,
  onClose,
  onSubmit,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(() => ({
    name: initialValue?.name || "",
    date: initialValue?.date || defaultDate,
    amount: initialValue?.amount.toString() || "",
    category: initialValue?.category || "Food",
    type: initialValue?.type || ("expense" as TransactionType),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    element.showModal();
    nameInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="transaction-dialog"
      aria-labelledby="transaction-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <p className="eyebrow">
            {initialValue ? "MAKE A CORRECTION" : "KEEP THE RECORD COMPLETE"}
          </p>
          <h2 id="transaction-title">
            {initialValue ? "Edit transaction" : "Add transaction"}
          </h2>
          <p>
            {accountMode
              ? "Changes are saved to your local account."
              : "Changes update the overview and stay in this browser."}
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Close transaction form"
          disabled={busy}
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>
      <form
        className="transaction-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const amount = Number(values.amount);
          if (
            !values.name.trim() ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !Number.isSafeInteger(Math.round(amount * 100))
          ) {
            setError("Enter a name and a valid amount greater than zero.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await onSubmit({
              ...values,
              name: values.name.trim(),
              amount: Math.round((amount + Number.EPSILON) * 100) / 100,
            });
            onClose();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not save transaction.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="form-wide">
          <span>Transaction name</span>
          <input
            ref={nameInput}
            className="input-base"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            placeholder="e.g. Groceries"
            required
            maxLength={100}
          />
        </label>
        <label>
          <span>Amount (USD)</span>
          <input
            className="input-base"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => setValues({ ...values, amount: e.target.value })}
            required
          />
        </label>
        <label>
          <span>Date</span>
          <input
            className="input-base"
            type="date"
            value={values.date}
            onChange={(e) => setValues({ ...values, date: e.target.value })}
            required
          />
        </label>
        <label>
          <span>Category</span>
          <select
            className="input-base"
            value={values.category}
            onChange={(e) => setValues({ ...values, category: e.target.value })}
          >
            {[
              ...new Set([values.category, ...categories, "Uncategorized"]),
            ].map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select
            className="input-base"
            value={values.type}
            onChange={(e) =>
              setValues({ ...values, type: e.target.value as TransactionType })
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        {error && (
          <p className="form-error form-wide" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions form-wide">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy
              ? "Saving…"
              : initialValue
                ? "Save changes"
                : "Add transaction"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
