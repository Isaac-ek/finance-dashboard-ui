import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "../lib/format";
import { formatMonth, shiftMonth } from "../lib/dates";
interface Props {
  month: string;
  highestCategory: string;
  highestCategoryValue: number;
  comparison: number | null;
  currentTotal: number;
  previousTotal: number;
}
export function InsightsPanel({
  month,
  highestCategory,
  highestCategoryValue,
  comparison,
  currentTotal,
  previousTotal,
}: Props) {
  const change =
    comparison === null
      ? currentTotal
        ? "No prior expenses"
        : "No expenses to compare"
      : comparison === 0
        ? "Unchanged"
        : `${Math.abs(comparison)}% ${comparison < 0 ? "less" : "more"}`;
  return (
    <aside className="insights-row" aria-label="Monthly insights">
      <div>
        <span className="insight-label">Largest spending category</span>
        <strong>{highestCategory}</strong>
        <p>
          {formatCurrency(highestCategoryValue)} in {formatMonth(month)}.
        </p>
      </div>
      <div>
        <span className="insight-label">
          Compared with {formatMonth(shiftMonth(month, -1))}
        </span>
        <strong className="comparison-value">
          {comparison !== null &&
            comparison !== 0 &&
            (comparison < 0 ? (
              <ArrowDownRight size={18} />
            ) : (
              <ArrowUpRight size={18} />
            ))}
          {change}
        </strong>
        <p>
          {formatCurrency(currentTotal)} spent, compared with{" "}
          {formatCurrency(previousTotal)}.
        </p>
      </div>
    </aside>
  );
}
