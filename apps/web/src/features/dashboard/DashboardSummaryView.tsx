import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { DashboardPerformanceChart } from "./DashboardPerformanceChart";
import {
  createDashboardExpense,
  getDashboardSummary,
  type DashboardSummaryPeriod
} from "./dashboard-summary.api";

const periods: Array<{ value: DashboardSummaryPeriod; label: string }> = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "current_month", label: "Este mes" },
  { value: "previous_month", label: "Mes anterior" }
];

const money = new Intl.NumberFormat("es-AR", {
  currency: "ARS",
  maximumFractionDigits: 0,
  style: "currency"
});

function formatMoney(cents: number) {
  return money.format(cents / 100);
}

function Change({ value }: { value: number | null }) {
  if (value == null) return <span>Sin período comparable</span>;
  return (
    <span className={value >= 0 ? "text-[#287553]" : "text-[#b04b43]"}>
      {value >= 0 ? "+" : ""}
      {value.toLocaleString("es-AR")}% vs mes anterior
    </span>
  );
}

export function DashboardSummaryView({
  onViewAgenda
}: {
  onViewAgenda: () => void;
}) {
  const [period, setPeriod] = useState<DashboardSummaryPeriod>("current_month");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expense, setExpense] = useState({
    amount: "",
    category: "General",
    date: new Date().toISOString().slice(0, 10),
    description: ""
  });
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", period],
    queryFn: () => getDashboardSummary(period),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const expenseMutation = useMutation({
    mutationFn: () =>
      createDashboardExpense({
        amountCents: Math.round(Number(expense.amount.replace(",", ".")) * 100),
        category: expense.category,
        description: expense.description,
        occurredOn: new Date(`${expense.date}T12:00:00`).toISOString()
      }),
    onSuccess: async () => {
      setExpense({
        amount: "",
        category: "General",
        date: new Date().toISOString().slice(0, 10),
        description: ""
      });
      setShowExpenseForm(false);
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    }
  });
  const data = summaryQuery.data;

  if (summaryQuery.isLoading) {
    return (
      <div className="grid min-h-80 place-items-center rounded-lg border border-[var(--color-border)] bg-white text-sm text-[var(--color-muted)]">
        Cargando rendimiento del negocio...
      </div>
    );
  }

  if (!data || summaryQuery.isError) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
        No pudimos cargar el resumen. Intentá nuevamente.
      </div>
    );
  }

  const cards = [
    {
      change: data.metrics.changes.incomePercent,
      label: "Ingresos del mes",
      value: formatMoney(data.metrics.incomeCents)
    },
    {
      change: data.metrics.changes.expensePercent,
      label: "Gastos del mes",
      value: formatMoney(data.metrics.expenseCents)
    },
    {
      change: undefined,
      label: "Ganancia neta",
      value: formatMoney(data.metrics.netIncomeCents)
    },
    {
      change: data.metrics.changes.completedPercent,
      label: "Turnos realizados",
      value: String(data.metrics.completedAppointments)
    },
    {
      change: undefined,
      label: "Ticket promedio",
      value: formatMoney(data.metrics.averageTicketCents)
    },
    {
      change: undefined,
      label: "Ocupación",
      value: `${data.metrics.occupancyPercent.toLocaleString("es-AR")}%`
    }
  ];

  const statusCards = [
    { label: "Turnos confirmados", value: data.metrics.confirmedAppointments },
    { label: "Señados", value: data.metrics.depositedAppointments },
    { label: "Pendientes", value: data.metrics.pendingAppointments },
    { label: "Cancelados", value: data.metrics.canceledAppointments },
    { label: "No asistencias", value: data.metrics.noShowAppointments }
  ];

  return (
    <div className="min-w-0 space-y-4">
      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3.5 py-3 shadow-[0_10px_28px_rgba(32,24,54,0.035)]"
          >
            <p className="text-xs font-medium text-[var(--color-muted-strong)]">
              {card.label}
            </p>
            <p className="mt-1.5 font-mono text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              {card.value}
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
              {card.change !== undefined ? <Change value={card.change} /> : "Mes actual"}
            </p>
          </article>
        ))}
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.75fr)]">
        <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-white p-3.5">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Ingresos y gastos</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Valores reconocidos desde turnos y gastos registrados
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-md border border-[var(--color-border)] p-1">
              {periods.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`rounded px-2.5 py-1 text-xs font-medium ${
                    period === item.value
                      ? "bg-[var(--color-ink)] text-[var(--color-button-text)]"
                      : "text-[var(--color-muted-strong)] hover:bg-[rgba(32,24,54,0.04)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-3">
            <DashboardPerformanceChart data={data.chart} />
          </div>
        </article>

        <article className="rounded-lg border border-[var(--color-border)] bg-white p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Resumen de hoy</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Actividad operativa actual
              </p>
            </div>
            <button
              type="button"
              onClick={onViewAgenda}
              className="text-xs font-semibold text-[var(--color-accent)]"
            >
              Ver agenda
            </button>
          </div>
          <p className="mt-4 font-mono text-2xl font-semibold">
            {data.today.appointments}
          </p>
          <p className="text-xs text-[var(--color-muted)]">turnos de hoy</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <TodayMetric
              label="Ingreso estimado"
              value={formatMoney(data.today.estimatedIncomeCents)}
            />
            <TodayMetric label="Confirmados" value={String(data.today.confirmed)} />
            <TodayMetric label="Señados" value={String(data.today.deposited)} />
            <TodayMetric label="Pendientes" value={String(data.today.pending)} />
            <TodayMetric label="Cancelados" value={String(data.today.canceled)} />
          </div>
          <ExpenseForm
            expense={expense}
            isSaving={expenseMutation.isPending}
            show={showExpenseForm}
            onChange={setExpense}
            onSubmit={() => expenseMutation.mutate()}
            onToggle={() => setShowExpenseForm((value) => !value)}
          />
        </article>
      </section>

      <section>
        <article className="rounded-lg border border-[var(--color-border)] bg-white p-3.5">
          <h2 className="text-base font-semibold">Estado de turnos del mes</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {statusCards.map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-[var(--color-border)] bg-[rgba(32,24,54,0.02)] px-3 py-2.5"
              >
                <p className="font-mono text-xl font-semibold text-[var(--color-ink)]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={`grid gap-4 ${data.team.length > 0 ? "xl:grid-cols-2" : ""}`}>
        <PerformanceList
          rows={data.services.map((item) => ({
            detail: `${item.appointments} turnos`,
            id: item.id,
            title: item.name,
            value: formatMoney(item.incomeCents)
          }))}
          title="Rendimiento por servicio"
        />
        {data.team.length > 0 && (
          <PerformanceList
            rows={data.team.map((item) => ({
              detail: `${item.completedAppointments} realizados`,
              id: item.id,
              title: item.name,
              value: formatMoney(item.incomeCents)
            }))}
            title="Rendimiento del equipo"
          />
        )}
      </section>
    </div>
  );
}

function TodayMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[rgba(32,24,54,0.025)] px-3 py-2.5">
      <p className="font-mono font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function ExpenseForm({
  expense,
  isSaving,
  onChange,
  onSubmit,
  onToggle,
  show
}: {
  expense: { amount: string; category: string; date: string; description: string };
  isSaving: boolean;
  onChange: (expense: { amount: string; category: string; date: string; description: string }) => void;
  onSubmit: () => void;
  onToggle: () => void;
  show: boolean;
}) {
  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="text-xs font-semibold text-[var(--color-accent)]"
      >
        {show ? "Cancelar" : "Registrar gasto"}
      </button>
      {show && (
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input
            required
            maxLength={160}
            value={expense.description}
            onChange={(event) =>
              onChange({ ...expense, description: event.target.value })
            }
            placeholder="Descripción"
            className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm"
          />
          <input
            required
            maxLength={80}
            value={expense.category}
            onChange={(event) => onChange({ ...expense, category: event.target.value })}
            placeholder="Categoría"
            className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={expense.amount}
              onChange={(event) => onChange({ ...expense, amount: event.target.value })}
              placeholder="Monto"
              className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm"
            />
            <input
              required
              type="date"
              value={expense.date}
              onChange={(event) => onChange({ ...expense, date: event.target.value })}
              className="h-9 rounded-md border border-[var(--color-border-strong)] px-2 text-sm"
            />
          </div>
          <button
            disabled={isSaving}
            className="h-9 rounded-md bg-[var(--color-ink)] text-xs font-semibold text-[var(--color-button-text)]"
          >
            {isSaving ? "Guardando..." : "Guardar gasto"}
          </button>
        </form>
      )}
    </div>
  );
}

function PerformanceList({
  rows,
  title
}: {
  rows: Array<{ detail: string; id: string; title: string; value: string }>;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-white p-3.5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 divide-y divide-[var(--color-border)]">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">
            Todavía no hay datos suficientes para este período.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.title}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{row.detail}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold">{row.value}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
