import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "../lib/format";
interface Props {
  title: string;
  value: number;
  note: string;
  icon: LucideIcon;
  accent: string;
}
export function SummaryCard({ title, value, note, icon: Icon, accent }: Props) {
  return (
    <article className={`metric-card ${accent}`} aria-label={title}>
      <div className="metric-label">
        <h2>{title}</h2>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="metric-value">{formatCurrency(value)}</p>
      <p className="metric-note">{note}</p>
    </article>
  );
}
