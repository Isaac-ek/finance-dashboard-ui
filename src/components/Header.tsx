import { Moon, Plus, Shield, SunMedium, UserRound } from "lucide-react";
import type { ThemeMode, UserRole } from "../types/finance";

interface HeaderProps {
  role: UserRole;
  theme: ThemeMode;
  onRoleChange: (role: UserRole) => void;
  onThemeToggle: () => void;
  onAddTransaction: () => void;
}

export function Header({
  role,
  theme,
  onRoleChange,
  onThemeToggle,
  onAddTransaction
}: HeaderProps) {
  return (
    <header className="panel animate-fade-up mb-6 overflow-hidden px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-600 dark:bg-emerald-950/60 dark:text-emerald-300">
            Personal Finance Control Center
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
                Modern Finance Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Track your balance, inspect cash flow, and manage transactions with role-aware controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onThemeToggle}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {theme === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
            {role === "admin" ? (
              <Shield size={18} className="text-accent-600" />
            ) : (
              <UserRound size={18} className="text-slate-500" />
            )}
            <select
              value={role}
              onChange={(event) => onRoleChange(event.target.value as UserRole)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none dark:text-slate-100"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {role === "admin" && (
            <button
              type="button"
              onClick={onAddTransaction}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-accent-600 dark:hover:bg-accent-500"
            >
              <Plus size={18} />
              Add Transaction
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
