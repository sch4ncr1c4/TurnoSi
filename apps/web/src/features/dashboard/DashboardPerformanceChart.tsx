import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { DashboardSummary } from "./dashboard-summary.api";

const money = new Intl.NumberFormat("es-AR", {
  currency: "ARS",
  maximumFractionDigits: 0,
  style: "currency"
});

function formatMoney(cents: number) {
  return money.format(cents / 100);
}

function formatDay(date: string) {
  return date.slice(8, 10);
}

function formatTooltipDay(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function localTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function DashboardPerformanceChart({
  data
}: {
  data: DashboardSummary["chart"];
}) {
  if (!data.some((item) => item.incomeCents > 0 || item.expenseCents > 0)) {
    return (
      <div className="grid min-h-64 place-items-center text-sm text-[var(--color-muted)]">
        Todavía no hay datos suficientes para este período.
      </div>
    );
  }

  const today = data.find((item) => item.date.slice(0, 10) === localTodayKey())?.date;
  const chartWidth = Math.max(720, data.length * 34);

  return (
    <div className="min-w-0 overflow-x-auto pb-1">
      <div className="h-56" style={{ minWidth: chartWidth }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ bottom: 0, left: -4, right: 8, top: 8 }}
        >
          <CartesianGrid stroke="rgba(32,24,54,0.08)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            axisLine={false}
            interval={0}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
          />
          <YAxis
            width={68}
            tickFormatter={formatMoney}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value))}
            labelFormatter={(label) => formatTooltipDay(String(label))}
            contentStyle={{
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              boxShadow: "0 12px 32px rgba(32,24,54,0.12)"
            }}
          />
          {today && (
            <ReferenceLine
              x={today}
              stroke="rgba(32,24,54,0.35)"
              strokeDasharray="4 4"
              label={{ fill: "var(--color-ink)", fontSize: 10, position: "top", value: "Hoy" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="incomeCents"
            name="Ingresos"
            stroke="var(--color-accent)"
            fill="rgba(253,134,6,0.14)"
            strokeWidth={3}
          />
          <Line
            type="monotone"
            dataKey="expenseCents"
            name="Gastos"
            stroke="#776f87"
            strokeWidth={3}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
