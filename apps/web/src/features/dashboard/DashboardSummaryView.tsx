import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { DashboardPerformanceChart } from "./DashboardPerformanceChart";
import {
  createDashboardExpense,
  deleteDashboardExpense,
  getDailyClosingPdf,
  getDashboardExpenses,
  getDashboardSummary,
  type DashboardExpense,
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date(value));
}

function localDateInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isOpeningClosingPdf, setIsOpeningClosingPdf] = useState(false);
  const [expense, setExpense] = useState({
    amount: "",
    category: "General",
    date: localDateInputValue(),
    description: ""
  });
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", period],
    queryFn: () => getDashboardSummary(period),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const expensesQuery = useQuery({
    queryKey: ["dashboard", "expenses", period],
    queryFn: () => getDashboardExpenses(period),
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
        date: localDateInputValue(),
        description: ""
      });
      setShowExpenseForm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "expenses"] })
      ]);
    }
  });
  const deleteExpenseMutation = useMutation({
    mutationFn: deleteDashboardExpense,
    onSettled: () => setDeletingExpenseId(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "expenses"] })
      ]);
    }
  });
  const data = summaryQuery.data;
  const todayDate = localDateInputValue();

  async function openDailyClosingPdf() {
    setIsOpeningClosingPdf(true);
    try {
      const blob = await getDailyClosingPdf(todayDate);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `cierre-caja-${todayDate}.pdf`;
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setIsOpeningClosingPdf(false);
    }
  }

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

  const todayStatusCards = [
    { label: "Confirmados", value: data.today.confirmed, tone: "bg-emerald-500" },
    { label: "Señados", value: data.today.deposited, tone: "bg-amber-500" },
    { label: "Pendientes", value: data.today.pending, tone: "bg-sky-500" },
    { label: "Cancelados", value: data.today.canceled, tone: "bg-rose-500" }
  ];

  const statusCards = [
    {
      accent: "bg-emerald-500",
      className: "border-emerald-200 bg-emerald-50/70",
      label: "Turnos confirmados",
      value: data.metrics.confirmedAppointments
    },
    {
      accent: "bg-amber-500",
      className: "border-amber-200 bg-amber-50/70",
      label: "Señados",
      value: data.metrics.depositedAppointments
    },
    {
      accent: "bg-sky-500",
      className: "border-sky-200 bg-sky-50/70",
      label: "Pendientes",
      value: data.metrics.pendingAppointments
    },
    {
      accent: "bg-rose-500",
      className: "border-rose-200 bg-rose-50/70",
      label: "Cancelados",
      value: data.metrics.canceledAppointments
    },
    {
      accent: "bg-zinc-500",
      className: "border-zinc-200 bg-zinc-50",
      label: "No asistencias",
      value: data.metrics.noShowAppointments
    }
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
          <div className="pt-4">
            <DashboardPerformanceChart data={data.chart} />
          </div>
        </article>

        <article className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-[0_14px_36px_rgba(32,24,54,0.04)]">
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
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[rgba(255,122,0,0.06)] p-3">
            <p className="text-xs font-medium text-[var(--color-muted)]">Turnos de hoy</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="font-mono text-3xl font-semibold">{data.today.appointments}</p>
              <p className="text-right text-xs text-[var(--color-muted)]">
                Ingreso estimado
                <span className="block font-mono text-base font-semibold text-[var(--color-ink)]">
                  {formatMoney(data.today.estimatedIncomeCents)}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {todayStatusCards.map((item) => (
              <TodayMetric
                key={item.label}
                label={item.label}
                tone={item.tone}
                value={String(item.value)}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={isOpeningClosingPdf}
            onClick={openDailyClosingPdf}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-white text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[rgba(32,24,54,0.035)] disabled:cursor-wait disabled:opacity-60"
          >
            {isOpeningClosingPdf ? "Generando PDF..." : "Abrir cierre de caja diario"}
          </button>
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
        <article className="rounded-lg border border-[var(--color-border)] bg-white p-3.5">
          <h2 className="text-base font-semibold">Estado de turnos del mes</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {statusCards.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border px-3 py-3 ${item.className}`}
              >
                <div className={`mb-2 h-1.5 w-8 rounded-full ${item.accent}`} />
                <p className="font-mono text-2xl font-semibold text-[var(--color-ink)]">{item.value}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        </article>
        <ExpensesList
          deletingId={deletingExpenseId}
          expenses={expensesQuery.data ?? []}
          isLoading={expensesQuery.isLoading}
          onDelete={(expenseId) => {
            setDeletingExpenseId(expenseId);
            deleteExpenseMutation.mutate(expenseId);
          }}
        />
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

function TodayMetric({
  label,
  tone,
  value
}: {
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(32,24,54,0.02)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-muted)]">{label}</p>
        <span className={`h-2 w-2 rounded-full ${tone}`} />
      </div>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function ExpensesList({
  deletingId,
  expenses,
  isLoading,
  onDelete
}: {
  deletingId: string | null;
  expenses: DashboardExpense[];
  isLoading: boolean;
  onDelete: (expenseId: string) => void;
}) {
  const total = expenses.reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Gastos registrados</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Del período seleccionado</p>
        </div>
        <span className="rounded-full bg-[rgba(125,116,139,0.12)] px-2.5 py-1 font-mono text-xs font-semibold">
          {formatMoney(total)}
        </span>
      </div>
      <div className="mt-3 max-h-64 overflow-y-auto pr-1">
        {isLoading ? (
          <p className="rounded-lg bg-[rgba(32,24,54,0.03)] p-4 text-center text-sm text-[var(--color-muted)]">
            Cargando gastos...
          </p>
        ) : expenses.length === 0 ? (
          <p className="rounded-lg bg-[rgba(32,24,54,0.03)] p-4 text-center text-sm text-[var(--color-muted)]">
            No hay gastos registrados en este período.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {expenses.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.description}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {item.category} · {formatDate(item.occurredOn)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold">{formatMoney(item.amountCents)}</p>
                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => onDelete(item.id)}
                    className="mt-1 text-xs font-semibold text-[#b04b43] disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
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
