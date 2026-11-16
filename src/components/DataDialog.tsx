import { useEffect, useMemo, useRef, useState } from "react";
import { X, Download, Upload } from "lucide-react";
import { useFinanceStore } from "../store/useFinanceStore";
import {
  parseCsv,
  guessMapping,
  previewCsv,
  readBackup,
  exportCsv,
  exportBackup,
  downloadFile,
  type CsvTable,
  type Mapping,
  type DateFormat,
} from "../lib/csv";
export function DataDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const state = useFinanceStore();
  const [table, setTable] = useState<CsvTable | null>(null),
    [mapping, setMapping] = useState<Mapping>({
      name: -1,
      date: -1,
      amount: -1,
      category: -1,
      type: -1,
    });
  const [format, setFormat] = useState<DateFormat>("iso"),
    [skip, setSkip] = useState(true),
    [replace, setReplace] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const preview = useMemo(() => {
    if (!table) return [];
    try {
      return previewCsv(
        table,
        mapping,
        format,
        replace ? [] : state.transactions,
      );
    } catch {
      return [];
    }
  }, [table, mapping, format, replace, state.transactions]);
  const bad = preview.filter((r) => r.error),
    duplicates = preview.filter((r) => r.duplicate),
    accepted = preview.filter((r) => r.value && (!skip || !r.duplicate));
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement;
    const element = ref.current!;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);
  const editor = state.role === "admin";
  return (
    <dialog
      ref={ref}
      className="transaction-dialog data-dialog"
      aria-labelledby="data-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <p className="eyebrow">YOUR RECORDS</p>
          <h2 id="data-title">Import & export</h2>
          <p>
            All {state.transactions.length} records. USD only; no currency
            conversion.
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Close import and export"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <div className="data-downloads">
        <button
          className="secondary-button"
          onClick={() =>
            downloadFile(
              "finance-transactions.csv",
              exportCsv(state.transactions),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={15} /> Export CSV
        </button>
        <button
          className="secondary-button"
          onClick={() =>
            downloadFile(
              "finance-backup.json",
              exportBackup(state.transactions),
              "application/json",
            )
          }
        >
          <Download size={15} /> Download backup
        </button>
      </div>
      <section className="data-section">
        <h3>Import transactions</h3>
        <p>Choose a CSV up to 2 MB / 5,000 rows. Preview it before saving.</p>
        <label className="file-label">
          <Upload size={16} /> Choose CSV
          <input
            aria-label="Choose CSV"
            type="file"
            accept=".csv,text/csv"
            disabled={!editor || busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError("");
              setTable(null);
              try {
                if (file.size > 2 * 1024 * 1024)
                  throw new Error("Choose a CSV smaller than 2 MB.");
                const t = parseCsv(await file.text());
                setTable(t);
                setMapping(guessMapping(t.headers));
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not read CSV.",
                );
              }
            }}
          />
        </label>
        {table && (
          <>
            <div className="mapping-grid">
              {(
                [
                  ["name", "Description"],
                  ["date", "Date"],
                  ["amount", "Amount"],
                  ["category", "Category"],
                  ["type", "Type"],
                ] as const
              ).map(([key, title]) => (
                <label key={key}>
                  {title}
                  <select
                    className="input-base"
                    aria-label={`${title} column`}
                    value={mapping[key]}
                    onChange={(e) =>
                      setMapping({ ...mapping, [key]: Number(e.target.value) })
                    }
                  >
                    <option value={-1}>
                      {key === "category"
                        ? "Uncategorized"
                        : key === "type"
                          ? "From amount sign"
                          : "Choose column"}
                    </option>
                    {table.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                Date format
                <select
                  className="input-base"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as DateFormat)}
                >
                  <option value="iso">YYYY-MM-DD</option>
                  <option value="dmy">DD/MM/YYYY</option>
                  <option value="mdy">MM/DD/YYYY</option>
                </select>
              </label>
            </div>
            <p>
              With no type column: negative amounts are expenses; positive
              amounts are income.
            </p>
            <label className="check-line">
              <input
                type="checkbox"
                checked={skip}
                onChange={(e) => setSkip(e.target.checked)}
              />{" "}
              Skip possible duplicates (same date, description, amount, type and
              category)
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />{" "}
              Replace existing records instead of adding to them
            </label>
            <p className="import-summary" role="status">
              {accepted.length} ready · {duplicates.length} possible duplicates
              · {bad.length} invalid rows
            </p>
            {preview.length === 0 && (
              <p>Map description, date and amount to preview your records.</p>
            )}
            <div className="import-preview">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.value?.name || "—"}</td>
                      <td>
                        {r.value
                          ? `${r.value.type === "expense" ? "−" : "+"}$${r.value.amount.toFixed(2)}`
                          : "—"}
                      </td>
                      <td>
                        {r.error ||
                          (r.duplicate ? "Possible duplicate" : "Ready")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bad.length > 0 && (
              <p className="form-error">
                Fix all invalid rows in the CSV and choose it again. No records
                have been imported.
              </p>
            )}
            {preview.length > 20 && (
              <p>
                Showing the first 20 rows. All {preview.length} rows are
                validated.
              </p>
            )}
            <button
              className="primary-button"
              disabled={
                busy || !editor || bad.length > 0 || accepted.length === 0
              }
              onClick={async () => {
                if (
                  replace &&
                  state.transactions.length &&
                  !window.confirm(
                    `Replace all ${state.transactions.length} existing records with ${accepted.length} imported records? Download a backup first if you need the old records.`,
                  )
                )
                  return;
                setBusy(true);
                setError("");
                try {
                  await state.importTransactions(
                    accepted.map((r) => r.value!),
                    skip,
                    replace,
                  );
                  onDone(`Imported ${accepted.length} transactions.`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Import failed.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : `Import ${accepted.length} transactions`}
            </button>
          </>
        )}
      </section>
      <section className="data-section">
        <h3>Restore a backup</h3>
        <p>
          A Finance JSON backup replaces all current records after confirmation.
          Exported IDs are replaced with fresh IDs on restore.
        </p>
        <label className="file-label">
          Choose backup
          <input
            aria-label="Choose backup"
            type="file"
            accept=".json,application/json"
            disabled={!editor || busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError("");
              try {
                if (file.size > 8 * 1024 * 1024)
                  throw new Error("Backup exceeds 8 MB.");
                const entries = readBackup(await file.text());
                if (
                  !window.confirm(
                    `Restore ${entries.length} records? This replaces all ${state.transactions.length} current records.`,
                  )
                )
                  return;
                setBusy(true);
                await state.restoreBackup(entries);
                onDone(`Restored ${entries.length} records.`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Restore failed.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </section>
      {!editor && <p>Switch to Editor demo to import or restore records.</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
