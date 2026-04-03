import type { LucideIcon } from "lucide-react";
import { formatCompactCurrency } from "../lib/format";

interface SummaryCardProps {
  title: string;
  value: number;
  note: string;
  icon: LucideIcon;
  accent: string;
}

export function SummaryCard({ title, value, note, icon: Icon, accent }: SummaryCardProps) {
  return (
    <article className="metric-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
            {formatCompactCurrency(value)}
          </h2>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{note}</p>
    </article>
  );
}
