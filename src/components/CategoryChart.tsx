import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "../lib/format";
const COLORS = [
  "var(--chart-income)",
  "var(--chart-expense)",
  "#8d9c85",
  "#a9a194",
  "#677b81",
  "#c3aa82",
  "#7e776f",
  "#b7c5b0",
];
export function CategoryChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  const total =
    data.reduce((sum, item) => sum + Math.round(item.value * 100), 0) / 100;
  return (
    <section
      className="panel category-panel"
      aria-labelledby="categories-title"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">WHERE IT WENT</p>
          <h2 id="categories-title">Spending breakdown</h2>
          <p>Expenses in the selected month</p>
        </div>
      </div>
      {data.length ? (
        <>
          <div className="donut-wrap" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={86}
                  paddingAngle={2}
                  stroke="var(--surface)"
                  isAnimationActive={false}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                    borderRadius: 10,
                    color: "var(--text)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-total">
              <span>TOTAL SPENT</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
          <ul className="category-list">
            {data.map((item, index) => (
              <li key={item.name}>
                <span>
                  <i style={{ background: COLORS[index % COLORS.length] }} />
                  {item.name}
                </span>
                <strong>{formatCurrency(item.value)}</strong>
                <small>{Math.round((item.value / total) * 100)}%</small>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="chart-empty">No expenses recorded for this month.</div>
      )}
    </section>
  );
}
