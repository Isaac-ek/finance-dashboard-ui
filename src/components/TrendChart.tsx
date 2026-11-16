import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "../lib/format";
interface Props {
  data: Array<{
    key: string;
    label: string;
    fullLabel: string;
    income: number;
    expenses: number;
    balance: number;
  }>;
}
export function TrendChart({ data }: Props) {
  const hasActivity = data.some((item) => item.income || item.expenses);
  return (
    <section className="panel trend-panel" aria-labelledby="cash-flow-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">THE BIG PICTURE</p>
          <h2 id="cash-flow-title">Cash flow</h2>
          <p>
            {data[0].fullLabel} – {data[5].fullLabel}
          </p>
        </div>
        <div className="chart-legend">
          <span>
            <i className="income-dot" />
            Income
          </span>
          <span>
            <i className="expense-dot" />
            Expenses
          </span>
        </div>
      </div>
      {hasActivity ? (
        <>
          <div className="trend-chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--chart-income)"
                      stopOpacity={0.16}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-income)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  dy={8}
                />
                <YAxis
                  tickFormatter={formatCompactCurrency}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  width={58}
                />
                <Tooltip<number, string>
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullLabel || ""
                  }
                  formatter={(
                    value: number,
                    name: string,
                  ): [string, string] => [
                    formatCurrency(value),
                    name === "income" ? "Income" : "Expenses",
                  ]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "var(--text)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="var(--chart-income)"
                  strokeWidth={2.5}
                  fill="url(#income-fill)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--chart-expense)"
                  strokeWidth={2.5}
                  fill="transparent"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data">
            <summary>View monthly figures</summary>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Income</th>
                  <th>Expenses</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.key}>
                    <th>{item.fullLabel}</th>
                    <td>{formatCurrency(item.income)}</td>
                    <td>{formatCurrency(item.expenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <div className="chart-empty">
          No activity in these six months. Choose another reporting month or add
          a transaction.
        </div>
      )}
    </section>
  );
}
