import { Moon, Plus, Sun, Wallet } from "lucide-react";
import type { ThemeMode, UserRole } from "../types/finance";
import { formatMonth } from "../lib/dates";

interface HeaderProps {
  role: UserRole;
  theme: ThemeMode;
  month: string;
  months: string[];
  onRoleChange: (role: UserRole) => void;
  onThemeToggle: () => void;
  onMonthChange: (month: string) => void;
  onAddTransaction: () => void;
}
export function Header({
  role,
  theme,
  month,
  months,
  onRoleChange,
  onThemeToggle,
  onMonthChange,
  onAddTransaction,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="workspace-bar">
        <div className="workspace-name">
          <span className="workspace-mark">
            <Wallet size={18} aria-hidden="true" />
          </span>{" "}
          Personal workspace <span className="demo-badge">DEMO</span>
        </div>
        <div className="workspace-controls">
          <label className="mode-select">
            <span className="sr-only">Demo access mode</span>
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
            >
              <option value="admin">Editor demo</option>
              <option value="viewer">Read-only demo</option>
            </select>
          </label>
          <button
            type="button"
            className="icon-button"
            onClick={onThemeToggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE MORE CLARITY</p>
          <h1>
            Finance overview<span>.</span>
          </h1>
          <p className="page-description">
            See what came in, what went out, and where it went.
          </p>
        </div>
        <div className="heading-actions">
          <label className="period-select">
            <span>Reporting month</span>
            <select
              aria-label="Reporting month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {months.map((value) => (
                <option key={value} value={value}>
                  {formatMonth(value)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-button"
            disabled={role !== "admin"}
            onClick={onAddTransaction}
          >
            <Plus size={17} aria-hidden="true" /> Add transaction
          </button>
        </div>
      </div>
      <p className="demo-note">
        <span className="status-dot" /> Fictional sample data · Changes stay in
        this browser.{" "}
        {role === "viewer"
          ? "Read-only preview selected."
          : "Try adding an expense to update the overview."}
      </p>
    </header>
  );
}
