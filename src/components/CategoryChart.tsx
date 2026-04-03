import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompactCurrency } from "../lib/format";

const COLORS = ["#0d9488", "#f97316", "#fbbf24", "#2563eb", "#8b5cf6", "#ef4444", "#14b8a6"];

interface CategoryChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export function CategoryChart({ data }: CategoryChartProps) {
  return (
    <div className="panel animate-fade-up p-5">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-ink-950 dark:text-white">Expense Categories</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          A quick look at where your spending is concentrated.
        </p>
      </div>

      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCompactCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.slice(0, 5).map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/80"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatCompactCurrency(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
