import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCompactCurrency } from "../lib/format";

interface TrendChartProps {
  data: Array<{
    label: string;
    income: number;
    expenses: number;
    balance: number;
  }>;
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="panel animate-fade-up p-5">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink-950 dark:text-white">6-Month Cash Trend</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Income and expense movement over the last six months.
          </p>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value) => formatCompactCurrency(value)}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              formatter={(value: number) => formatCompactCurrency(value)}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.2)",
                backgroundColor: "rgba(15, 23, 42, 0.96)",
                color: "#fff"
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#0d9488"
              strokeWidth={3}
              fill="url(#incomeFill)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#f97316"
              strokeWidth={3}
              fill="url(#expenseFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
