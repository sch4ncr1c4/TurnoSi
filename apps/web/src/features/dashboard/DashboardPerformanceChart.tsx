import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { DashboardSummary } from "./dashboard-summary.api";

type ChartPoint = DashboardSummary["chart"][number];

const money = new Intl.NumberFormat("es-AR", {
  currency: "ARS",
  maximumFractionDigits: 0,
  style: "currency"
});

function formatMoney(cents: number) {
  return money.format(cents / 100);
}

function formatAxisMoney(cents: number) {
  const value = cents / 100;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString("es-AR")} k`;
  return `$${value.toLocaleString("es-AR")}`;
}

function dayLabel(date: string) {
  return date.slice(8, 10);
}

function fullDateLabel(date: string) {
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

type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string;
    value?: number | string;
  }>;
};

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs shadow-[0_12px_32px_rgba(32,24,54,0.14)]">
      <p className="font-semibold text-[var(--color-ink)]">{fullDateLabel(String(label))}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => (
          <p key={item.dataKey} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-[var(--color-muted-strong)]">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: item.color ?? "var(--color-muted)" }}
              />
              {item.name}
            </span>
            <span className="font-mono font-semibold text-[var(--color-ink)]">
              {formatMoney(Number(item.value ?? 0))}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function DashboardPerformanceChart({ data }: { data: ChartPoint[] }) {
  const hasValues = data.some((item) => item.incomeCents > 0 || item.expenseCents > 0);
  const today = data.find((item) => item.date === localTodayKey()) ?? data.at(-1);
  const chartWidth = Math.max(760, data.length * 42);

  if (!hasValues) {
    return (
      <div className="grid min-h-56 place-items-center text-sm text-[var(--color-muted)]">
        Todavía no hay datos suficientes para este período.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {today && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-[rgba(32,24,54,0.07)] px-2 py-1 font-semibold text-[var(--color-ink)]">
            Día activo: {fullDateLabel(today.date)}
          </span>
          <span className="rounded-md bg-[rgba(253,134,6,0.09)] px-2 py-1 text-[var(--color-muted-strong)]">
            Ingresos {formatMoney(today.incomeCents)}
          </span>
          <span className="rounded-md bg-[rgba(119,111,135,0.1)] px-2 py-1 text-[var(--color-muted-strong)]">
            Gastos {formatMoney(today.expenseCents)}
          </span>
        </div>
      )}
      <div className="overflow-x-auto pb-1">
        <div className="h-60" style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 2, left: 12, right: 18, top: 8 }}>
              <CartesianGrid stroke="rgba(32,24,54,0.08)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dayLabel}
                axisLine={false}
                interval={0}
                minTickGap={0}
                tickLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
              />
              <YAxis
                width={74}
                tickFormatter={formatAxisMoney}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(32,24,54,0.035)" }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              />
              <Bar
                dataKey="incomeCents"
                name="Ingresos"
                fill="var(--color-accent)"
                radius={[5, 5, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="expenseCents"
                name="Gastos"
                fill="#776f87"
                radius={[5, 5, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
