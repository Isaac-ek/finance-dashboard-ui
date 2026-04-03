import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { formatCurrency } from "../lib/format";

interface InsightsPanelProps {
  highestCategory: string;
  highestCategoryValue: number;
  comparison: number;
  currentTotal: number;
  previousTotal: number;
}

export function InsightsPanel({
  highestCategory,
  highestCategoryValue,
  comparison,
  currentTotal,
  previousTotal
}: InsightsPanelProps) {
  const isImproved = comparison <= 0;

  return (
    <aside className="panel animate-fade-up h-full p-5">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink-950 dark:text-white">Insights</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Auto-calculated from your current dataset.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/80">
          <p className="text-sm text-slate-500 dark:text-slate-400">Highest spend this month</p>
          <h4 className="mt-2 text-xl font-bold text-ink-950 dark:text-white">{highestCategory}</h4>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {formatCurrency(highestCategoryValue)} in the current month.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/80">
          <p className="text-sm text-slate-500 dark:text-slate-400">Month-over-month change</p>
          <div className="mt-2 flex items-center gap-2">
            {isImproved ? (
              <ArrowDownRight className="text-accent-600" size={20} />
            ) : (
              <ArrowUpRight className="text-coral-500" size={20} />
            )}
            <h4 className="text-xl font-bold text-ink-950 dark:text-white">
              {Math.abs(comparison)}% {isImproved ? "less" : "more"}
            </h4>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            You spent {formatCurrency(currentTotal)} this month versus {formatCurrency(previousTotal)} last month.
          </p>
        </div>
      </div>
    </aside>
  );
}
