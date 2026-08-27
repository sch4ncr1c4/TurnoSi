import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { DashboardPerformanceChart } from "./DashboardPerformanceChart";
import {
  createDashboardExpense,
  deleteDashboardExpense,
  getDailyClosingPdf,
  getDashboardExpenses,
  getDashboardSummary,
  type DashboardExpense,
  type DashboardSummary,
  type DashboardSummaryPeriod
} from "./dashboard-summary.api";

const periods: Array<{ value: DashboardSummaryPeriod; label: string }> = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "current_month", label: "Este mes" },
  { value: "previous_month", label: "Mes anterior" }
];

const expenseCategories = ["General", "Insumos", "Alquiler", "Servicios", "Sueldos", "Limpieza", "Marketing", "Otro"];
const paymentMethods = [
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "bank_transfer" },
  { label: "Mercado Pago", value: "mercadopago" },
  { label: "Otro", value: "other" }
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

function formatExpenseMethod(value: string | null) {
  return paymentMethods.find((method) => method.value === value)?.label ?? "Sin método";
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
  if (value === 0) return <span className="text-[var(--color-muted)]">Sin cambios</span>;
  return (
    <span className={value > 0 ? "text-[#287553]" : "text-[#b04b43]"}>
      {value > 0 ? "+" : ""}
      {value.toLocaleString("es-AR")}% vs período anterior
    </span>
  );
}

export function DashboardSummaryView({
  onViewAgenda
}: {
  onViewAgenda: () => void;
}) {
  const [activeSection, setActiveSection] = useState<"daily" | "analytics">("daily");
  const [period, setPeriod] = useState<DashboardSummaryPeriod>("current_month");
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isOpeningClosingPdf, setIsOpeningClosingPdf] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const maxClosingDate = localDateInputValue();
  const [closingDate, setClosingDate] = useState(maxClosingDate);
  const [expense, setExpense] = useState({
    amount: "",
    category: "General",
    date: localDateInputValue(),
    description: "",
    paymentMethod: "cash"
  });
  const [expenseErrors, setExpenseErrors] = useState<Partial<Record<keyof typeof expense, string>>>({});
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
        paymentMethod: expense.paymentMethod,
        occurredOn: new Date(`${expense.date}T12:00:00`).toISOString()
      }),
    onSuccess: async () => {
      setExpense({
        amount: "",
        category: "General",
        date: localDateInputValue(),
        description: "",
        paymentMethod: "cash"
      });
      setExpenseErrors({});
      setIsExpenseFormOpen(false);
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

  function submitExpense() {
    const amount = Number(expense.amount.replace(",", "."));
    const nextErrors: Partial<Record<keyof typeof expense, string>> = {};
    if (expense.description.trim().length < 2) nextErrors.description = "Ingresá una descripción.";
    if (!expense.category) nextErrors.category = "Elegí una categoría.";
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = "Ingresá un monto válido.";
    if (!expense.date) nextErrors.date = "Elegí una fecha.";
    if (!expense.paymentMethod) nextErrors.paymentMethod = "Elegí un método.";
    setExpenseErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) expenseMutation.mutate();
  }

  async function openDailyClosingPdf() {
    setIsOpeningClosingPdf(true);
    try {
      const blob = await getDailyClosingPdf(closingDate);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `cierre-caja-${closingDate}.pdf`;
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
      helper: "Ingresos reconocidos: turnos pagados/completados y señas aprobadas.",
      label: "Ingresos",
      value: formatMoney(data.metrics.incomeCents)
    },
    {
      change: data.metrics.changes.expensePercent,
      helper: "Gastos registrados dentro del período seleccionado.",
      label: "Gastos",
      value: formatMoney(data.metrics.expenseCents)
    },
    {
      change: data.metrics.changes.netIncomePercent,
      helper: "Ingresos menos gastos del período seleccionado.",
      label: "Ganancia neta",
      value: formatMoney(data.metrics.netIncomeCents)
    },
    {
      change: data.metrics.changes.completedPercent,
      helper: "Turnos cobrados o completados dentro del período.",
      label: "Turnos realizados",
      value: String(data.metrics.completedAppointments)
    },
    {
      change: data.metrics.changes.averageTicketPercent,
      helper: "Promedio facturado por turno realizado en el período seleccionado.",
      label: "Ticket promedio",
      value: formatMoney(data.metrics.averageTicketCents)
    },
    {
      change: data.metrics.changes.occupancyPercent,
      helper: "Turnos confirmados o completados sobre el total agendado. No mide ocupación horaria real.",
      label: "Ocupación",
      value: `${data.metrics.occupancyPercent.toLocaleString("es-AR")}%`
    },
    {
      change: data.metrics.changes.cancellationRatePercent,
      helper: "Porcentaje de turnos cancelados sobre el total agendado.",
      label: "Cancelación",
      value: `${data.metrics.cancellationRatePercent.toLocaleString("es-AR")}%`
    },
    {
      change: data.metrics.changes.noShowRatePercent,
      helper: "Porcentaje de turnos marcados como No asistió sobre el total agendado.",
      label: "No asistencia",
      value: `${data.metrics.noShowRatePercent.toLocaleString("es-AR")}%`
    }
  ];

  const todayStatusCards = [
    { label: "Pendiente", value: data.today.pending, tone: "bg-sky-500" },
    { label: "Confirmado", value: data.today.confirmed, tone: "bg-emerald-500" },
    { label: "Completado", value: data.today.completed, tone: "bg-[var(--color-ink)]" },
    { label: "Cancelado", value: data.today.canceled, tone: "bg-rose-500" },
    { label: "No asistió", value: data.today.noShow, tone: "bg-zinc-500" }
  ];

  const statusCards = [
    {
      accent: "bg-emerald-500",
      className: "border-zinc-200 bg-[#f6f7f9]",
      label: "Confirmados",
      value: data.metrics.confirmedAppointments
    },
    {
      accent: "bg-[var(--color-ink)]",
      className: "border-zinc-200 bg-[#f6f7f9]",
      label: "Completados",
      value: data.metrics.completedAppointments
    },
    {
      accent: "bg-sky-500",
      className: "border-zinc-200 bg-[#f6f7f9]",
      label: "Pendientes",
      value: data.metrics.pendingAppointments
    },
    {
      accent: "bg-rose-500",
      className: "border-zinc-200 bg-[#f6f7f9]",
      label: "Cancelados",
      value: data.metrics.canceledAppointments
    },
    {
      accent: "bg-zinc-500",
      className: "border-zinc-200 bg-[#f6f7f9]",
      label: "No asistencias",
      value: data.metrics.noShowAppointments
    }
  ];
  const paymentCards = [
    {
      accent: "bg-[var(--color-accent)]",
      className: "border-zinc-200 bg-[#f6f7f9]",
      helper: "Cantidad de reservas con seña aprobada en el período.",
      label: "Señas cobradas",
      value: data.metrics.depositedAppointments
    },
    {
      accent: "bg-emerald-500",
      className: "border-zinc-200 bg-[#f6f7f9]",
      helper: "Importe total cobrado como seña en el período.",
      label: "Total en señas",
      value: formatMoney(data.metrics.depositIncomeCents)
    },
    {
      accent: "bg-sky-500",
      className: "border-zinc-200 bg-[#f6f7f9]",
      helper: "Saldo estimado por cobrar de turnos pendientes o confirmados, descontando señas aprobadas.",
      label: "Pendiente de cobro",
      value: formatMoney(data.metrics.pendingCollectionCents)
    }
  ];

  return (
    <div className="min-w-0 space-y-3 text-[13px]">
      <SummarySectionTabs
        active={activeSection}
        onChange={setActiveSection}
      />

      {activeSection === "daily" ? (
        <div className="w-full space-y-6 2xl:max-w-[1480px]">
          <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.62fr)]">
            <article className="rounded-lg border border-[var(--color-border)] bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Resumen de hoy</h2>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">Qué pasó hoy en turnos y caja.</p>
                </div>
                <button
                  type="button"
                  onClick={onViewAgenda}
                  className="text-xs font-semibold text-[var(--color-accent)]"
                >
                  Ver agenda
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <TodayMetric label="Turnos" tone="bg-[var(--color-accent)]" value={String(data.today.appointments)} />
                <TodayMetric label="Ingresos" tone="bg-emerald-500" value={formatMoney(data.today.estimatedIncomeCents)} />
                <TodayMetric label="Gastos" tone="bg-rose-500" value={formatMoney(data.today.expenseCents)} />
                <TodayMetric label="Caja esperada" tone="bg-[var(--color-ink)]" value={formatMoney(data.today.netIncomeCents)} />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {todayStatusCards.map((item) => (
                  <StatusPill
                    key={item.label}
                    label={item.label}
                    tone={item.tone}
                    value={String(item.value)}
                  />
                ))}
              </div>
            </article>
            <UpcomingAppointments appointments={data.today.upcoming} onManage={onViewAgenda} compact />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
            <DailyMovements movements={data.today.movements} />
            <article className="rounded-lg border border-[var(--color-border)] bg-white p-5">
              <h2 className="text-sm font-semibold">Gastos del día</h2>
              <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">Se descuentan del cierre de caja.</p>
              <p className="mt-5 font-mono text-xl font-semibold">{formatMoney(data.today.expenseCents)}</p>
              <button
                type="button"
                onClick={() => setIsExpenseFormOpen(true)}
                className="mt-5 h-9 w-full rounded-md border border-[var(--color-border-strong)] bg-white text-xs font-semibold text-[var(--color-ink)] hover:bg-[rgba(32,24,54,0.04)]"
              >
                Registrar gasto
              </button>
            </article>
          </section>

          <DailyClosingCard
            closingDate={closingDate}
            expenseCents={data.today.expenseCents}
            incomeCents={data.today.estimatedIncomeCents}
            isOpening={isOpeningClosingPdf}
            maxClosingDate={maxClosingDate}
            netIncomeCents={data.today.netIncomeCents}
            paymentMethods={data.today.paymentMethods}
            onChangeDate={setClosingDate}
            onOpenPdf={openDailyClosingPdf}
          />

          {isExpenseFormOpen && (
            <ExpenseModal onClose={() => setIsExpenseFormOpen(false)}>
              <ExpenseForm
                expense={expense}
                errors={expenseErrors}
                isSaving={expenseMutation.isPending}
                onChange={(nextExpense) => {
                  setExpense(nextExpense);
                  setExpenseErrors({});
                }}
                onSubmit={submitExpense}
              />
            </ExpenseModal>
          )}
        </div>
      ) : (
        <>
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <article
                key={card.label}
                title={card.helper}
                className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 shadow-[0_8px_22px_rgba(32,24,54,0.03)]"
              >
                <p className="text-xs font-medium text-[var(--color-muted-strong)]">
                  {card.label}
                </p>
                <p className="mt-1 font-mono text-base font-semibold tracking-tight text-[var(--color-ink)]">
                  {card.value}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  <Change value={card.change} />
                </p>
              </article>
            ))}
          </section>

          <section className="min-w-0 rounded-lg border border-[var(--color-border)] bg-white p-3">
        <div className="flex flex-col gap-2.5 border-b border-[var(--color-border)] pb-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Ingresos y gastos</h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
              Valores reconocidos desde turnos y gastos registrados
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-md border border-[var(--color-border)] p-1">
            {periods.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
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
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.55fr)]">
        <article className="rounded-lg border border-[var(--color-border)] bg-white p-2.5">
          <h2 className="text-sm font-semibold">Estado de turnos</h2>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
            {statusCards.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border px-2.5 py-2 ${item.className}`}
              >
                <div className={`mb-1.5 h-1 w-7 rounded-full ${item.accent}`} />
                <p className="font-mono text-lg font-semibold text-[var(--color-ink)]">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 border-t border-[var(--color-border)] pt-2.5">
            <h3 className="text-xs font-semibold text-[var(--color-muted-strong)]">Pago y seña</h3>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {paymentCards.map((item) => (
                <div key={item.label} title={item.helper} className={`rounded-lg border px-2.5 py-2 ${item.className}`}>
                  <div className={`mb-1.5 h-1 w-7 rounded-full ${item.accent}`} />
                  <p className="font-mono text-base font-semibold text-[var(--color-ink)]">{item.value}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{item.label}</p>
                </div>
              ))}
            </div>
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

          <section className={`grid gap-3 ${data.team.length > 0 ? "xl:grid-cols-2" : ""}`}>
        <PerformanceList
          rows={data.services.map((item) => ({
            details: [
              `${item.appointments} turnos`,
              `Ticket ${formatMoney(item.averageTicketCents)}`,
              `${item.incomeSharePercent.toLocaleString("es-AR")}% de la facturación`
            ],
            id: item.id,
            title: item.name,
            value: formatMoney(item.incomeCents)
          }))}
          title="Rendimiento por servicio"
        />
        {data.team.length > 0 && (
          <PerformanceList
            rows={data.team.map((item) => ({
              details: [
                `${item.completedAppointments} realizados`,
                `Ticket ${formatMoney(item.averageTicketCents)}`,
                `${item.occupancyPercent.toLocaleString("es-AR")}% de realizados`
              ],
              id: item.id,
              title: item.name,
              value: formatMoney(item.incomeCents)
            }))}
            title="Rendimiento del equipo"
          />
        )}
          </section>
        </>
      )}
    </div>
  );
}

function SummarySectionTabs({
  active,
  onChange
}: {
  active: "daily" | "analytics";
  onChange: (section: "daily" | "analytics") => void;
}) {
  const tabs = [
    { label: "Diario", value: "daily" as const },
    { label: "Analítica", value: "analytics" as const }
  ];

  return (
    <nav className="inline-flex h-9 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white p-0.5 shadow-[0_8px_22px_rgba(32,24,54,0.03)]">
      {tabs.map((tab, index) => (
        <div key={tab.value} className="flex items-center">
          {index > 0 && <span className="mx-1 h-4 w-px bg-[var(--color-border)]" />}
          <button
            type="button"
            onClick={() => onChange(tab.value)}
            className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
              active === tab.value
                ? "bg-[var(--color-ink)] text-[var(--color-button-text)]"
                : "text-[var(--color-muted-strong)] hover:bg-[rgba(32,24,54,0.04)]"
            }`}
          >
            {tab.label}
          </button>
        </div>
      ))}
    </nav>
  );
}

function DailyClosingCard({
  closingDate,
  expenseCents,
  incomeCents,
  isOpening,
  maxClosingDate,
  netIncomeCents,
  paymentMethods,
  onChangeDate,
  onOpenPdf
}: {
  closingDate: string;
  expenseCents: number;
  incomeCents: number;
  isOpening: boolean;
  maxClosingDate: string;
  netIncomeCents: number;
  paymentMethods: DashboardSummary["today"]["paymentMethods"];
  onChangeDate: (date: string) => void;
  onOpenPdf: () => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold">Cierre de caja</h3>
        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">Acción final del día con detalle de caja.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ClosingMetric label="Ingresos" value={formatMoney(incomeCents)} />
        <ClosingMetric label="Gastos" value={formatMoney(expenseCents)} />
        <ClosingMetric label="Neto / caja esperada" value={formatMoney(netIncomeCents)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
        {paymentMethods.length === 0 ? (
          <span className="rounded-md bg-white px-2 py-1 text-[11px] text-[var(--color-muted)]">Sin cobros registrados</span>
        ) : (
          paymentMethods.map((item) => (
            <span key={item.method} className="rounded-md bg-white px-2 py-1 text-[11px] text-[var(--color-muted-strong)]">
              {item.method}: <strong className="font-mono text-[var(--color-ink)]">{formatMoney(item.amountCents)}</strong>
            </span>
          ))
        )}
      </div>
      <div className="mt-4 grid gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end sm:justify-between">
        <label className="text-[11px] font-semibold text-[var(--color-muted-strong)]">
          Fecha del cierre
          <input
            type="date"
            max={maxClosingDate}
            value={closingDate}
            onChange={(event) => onChangeDate(event.target.value > maxClosingDate ? maxClosingDate : event.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-2 text-xs font-normal text-[var(--color-ink)]"
          />
        </label>
        <button
          type="button"
          disabled={isOpening}
          onClick={onOpenPdf}
          className="h-9 rounded-md bg-[var(--color-ink)] px-4 text-xs font-semibold text-[var(--color-button-text)] transition hover:opacity-95 disabled:cursor-wait disabled:opacity-60 sm:justify-self-end"
        >
          {isOpening ? "Generando..." : "Abrir cierre"}
        </button>
      </div>
    </section>
  );
}

function ClosingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f6f7f9] px-3 py-2.5">
      <p className="text-[10px] font-medium text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[var(--color-ink)]">{value}</p>
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
    <div className="rounded-md bg-[#f6f7f9] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--color-muted)]">{label}</p>
        <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
      </div>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  tone,
  value
}: {
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-[#f3f4f6] px-2.5 py-1 text-[11px] text-[var(--color-muted-strong)]">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
      <strong className="font-mono text-[var(--color-ink)]">{value}</strong>
      {label}
    </span>
  );
}

function UpcomingAppointments({
  appointments,
  compact = false,
  onManage
}: {
  appointments: DashboardSummary["today"]["upcoming"];
  compact?: boolean;
  onManage: () => void;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Próximos turnos</h2>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">Agenda pendiente de hoy.</p>
        </div>
      </div>
      {appointments.length === 0 ? (
        <p className="mt-3 rounded-lg bg-[rgba(32,24,54,0.03)] p-3 text-center text-xs text-[var(--color-muted)]">
          No quedan turnos para hoy.
        </p>
      ) : (
        compact ? (
          <div className="mt-4 space-y-2.5">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="grid gap-2 rounded-md bg-[#f6f7f9] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      <span className="font-mono">{appointment.time}</span> · {appointment.client}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted)]">
                      {appointment.service} · {appointment.professional}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onManage}
                    className="shrink-0 rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-ink)] hover:bg-white"
                  >
                    Gestionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <SummaryBadge label={appointment.status} tone="appointment" />
                  <SummaryBadge label={appointment.paymentStatus} tone="payment" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[10px] uppercase text-[var(--color-muted)]">
              <tr className="border-b border-[var(--color-border)]">
                <th className="py-2 pr-3 font-semibold">Hora</th>
                <th className="py-2 pr-3 font-semibold">Cliente</th>
                <th className="py-2 pr-3 font-semibold">Servicio</th>
                <th className="py-2 pr-3 font-semibold">Profesional</th>
                <th className="py-2 pr-3 font-semibold">Turno</th>
                <th className="py-2 font-semibold">Pago</th>
                <th className="py-2 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="py-1.5 pr-3 font-mono font-semibold">{appointment.time}</td>
                  <td className="py-1.5 pr-3 font-semibold">{appointment.client}</td>
                  <td className="py-1.5 pr-3 text-[var(--color-muted-strong)]">{appointment.service}</td>
                  <td className="py-1.5 pr-3 text-[var(--color-muted-strong)]">{appointment.professional}</td>
                  <td className="py-1.5 pr-3"><SummaryBadge label={appointment.status} tone="appointment" /></td>
                  <td className="py-1.5"><SummaryBadge label={appointment.paymentStatus} tone="payment" /></td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      onClick={onManage}
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-ink)] hover:bg-[rgba(32,24,54,0.04)]"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}
    </article>
  );
}

function SummaryBadge({ label, tone }: { label: string; tone: "appointment" | "payment" }) {
  const normalizedLabel = label.toLowerCase();
  const className =
    tone === "payment"
      ? normalizedLabel.includes("pag")
        ? "bg-emerald-50 text-[#287553] border-emerald-200"
        : normalizedLabel.includes("pendiente")
          ? "bg-zinc-50 text-[var(--color-muted-strong)] border-zinc-200"
          : "bg-zinc-50 text-[var(--color-muted-strong)] border-zinc-200"
      : label === "Cancelado" || label === "No asistió"
        ? "bg-rose-50 text-[#b04b43] border-rose-200"
        : label === "Pendiente"
          ? "bg-sky-50 text-[#246b8f] border-sky-200"
          : "bg-[rgba(32,24,54,0.06)] text-[var(--color-ink)] border-[var(--color-border)]";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}>{label}</span>;
}

function DailyMovements({
  movements
}: {
  movements: DashboardSummary["today"]["movements"];
}) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-white p-4">
      <h2 className="text-sm font-semibold">Movimientos del día</h2>
      <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">Ingresos y gastos ordenados por hora.</p>
      {movements.length === 0 ? (
        <p className="mt-3 rounded-lg bg-[rgba(32,24,54,0.03)] p-4 text-center text-xs text-[var(--color-muted)]">
          Sin movimientos registrados.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {movements.map((movement, index) => (
            <div key={`${movement.kind}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-[#f6f7f9] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{movement.time} · {movement.concept}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{movement.method} · {movement.kind === "expense" ? "Gasto" : "Ingreso"} · {movement.label}</p>
              </div>
              <span className={`shrink-0 font-mono text-xs font-semibold ${movement.kind === "expense" ? "text-[#b04b43]" : "text-[#287553]"}`}>
                {movement.kind === "expense" ? "-" : "+"}{formatMoney(movement.amountCents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ExpenseModal({
  children,
  onClose
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 px-3 py-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg bg-white shadow-[0_24px_80px_rgba(4,2,12,0.32)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Registrar gasto</h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">Cargá un egreso para el cierre del día.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-[var(--color-muted-strong)] hover:bg-[rgba(32,24,54,0.05)]"
          >
            ×
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
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
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const total = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  const expensesByDay = expenses.reduce<Array<{ date: string; expenses: DashboardExpense[]; totalCents: number }>>(
    (groups, expense) => {
      const date = formatDate(expense.occurredOn);
      const group = groups.find((item) => item.date === date);
      if (group) {
        group.expenses.push(expense);
        group.totalCents += expense.amountCents;
      } else {
        groups.push({ date, expenses: [expense], totalCents: expense.amountCents });
      }
      return groups;
    },
    []
  );
  const safeDayIndex = Math.min(selectedDayIndex, Math.max(expensesByDay.length - 1, 0));
  const selectedGroup = expensesByDay[safeDayIndex];
  const visibleExpenses = selectedGroup?.expenses.slice(0, 3) ?? [];

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Gastos registrados</h2>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">Gestionados por día</p>
        </div>
        <span className="rounded-full bg-[rgba(125,116,139,0.12)] px-2 py-0.5 font-mono text-xs font-semibold">
          {formatMoney(total)}
        </span>
      </div>
      <div className="mt-2.5 pr-1">
        {isLoading ? (
          <p className="rounded-lg bg-[rgba(32,24,54,0.03)] p-4 text-center text-sm text-[var(--color-muted)]">
            Cargando gastos...
          </p>
        ) : expenses.length === 0 ? (
          <p className="rounded-lg bg-[rgba(32,24,54,0.03)] p-4 text-center text-sm text-[var(--color-muted)]">
            No hay gastos registrados en este período.
          </p>
        ) : (
          <section>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Ver día anterior"
                disabled={safeDayIndex >= expensesByDay.length - 1}
                onClick={() => setSelectedDayIndex(Math.min(safeDayIndex + 1, expensesByDay.length - 1))}
                className="rounded px-1 text-lg leading-none text-[var(--color-muted-strong)] hover:bg-[rgba(32,24,54,0.05)] disabled:invisible"
              >
                ‹
              </button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                <p className="text-[11px] font-semibold text-[var(--color-muted-strong)]">{selectedGroup?.date}</p>
                <span className="font-mono text-[11px] font-semibold text-[var(--color-ink)]">
                  {formatMoney(selectedGroup?.totalCents ?? 0)}
                </span>
              </div>
              <button
                type="button"
                aria-label="Ver día más reciente"
                disabled={safeDayIndex === 0}
                onClick={() => setSelectedDayIndex(Math.max(safeDayIndex - 1, 0))}
                className="rounded px-1 text-lg leading-none text-[var(--color-muted-strong)] hover:bg-[rgba(32,24,54,0.05)] disabled:invisible"
              >
                ›
              </button>
            </div>
            <div className="divide-y divide-[var(--color-border)] rounded-md bg-[#f6f7f9] px-2">
              {visibleExpenses.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{item.description}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                      {item.category} · {formatExpenseMethod(item.paymentMethod)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs font-semibold">{formatMoney(item.amountCents)}</p>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => onDelete(item.id)}
                      className="mt-0.5 text-[11px] font-semibold text-[#b04b43] disabled:opacity-50"
                    >
                      {deletingId === item.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {selectedGroup && selectedGroup.expenses.length > 3 ? (
              <p className="mt-1 text-center text-[10px] text-[var(--color-muted)]">
                Mostrando 3 de {selectedGroup.expenses.length} gastos de este día
              </p>
            ) : null}
          </section>
        )}
      </div>
    </article>
  );
}

function ExpenseForm({
  expense,
  errors,
  isSaving,
  onChange,
  onSubmit
}: {
  expense: { amount: string; category: string; date: string; description: string; paymentMethod: string };
  errors: Partial<Record<keyof typeof expense, string>>;
  isSaving: boolean;
  onChange: (expense: { amount: string; category: string; date: string; description: string; paymentMethod: string }) => void;
  onSubmit: () => void;
}) {
  return (
    <article className="bg-white">
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="text-xs font-semibold text-[var(--color-muted-strong)]">
          Descripción
          <input
            maxLength={160}
            value={expense.description}
            onChange={(event) =>
              onChange({ ...expense, description: event.target.value })
            }
            placeholder="Ej: Insumos, limpieza, alquiler"
            className="mt-1 h-10 w-full rounded-md border border-[var(--color-border-strong)] px-3 text-sm font-normal text-[var(--color-ink)]"
          />
          {errors.description && <FieldError>{errors.description}</FieldError>}
        </label>
        <label className="text-xs font-semibold text-[var(--color-muted-strong)]">
          Categoría
          <select
            value={expense.category}
            onChange={(event) => onChange({ ...expense, category: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-normal text-[var(--color-ink)]"
          >
            {expenseCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {errors.category && <FieldError>{errors.category}</FieldError>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[var(--color-muted-strong)]">
            Monto
            <input
              step="0.01"
              type="number"
              value={expense.amount}
              onChange={(event) => onChange({ ...expense, amount: event.target.value })}
              placeholder="$ 0"
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-border-strong)] px-3 text-sm font-normal text-[var(--color-ink)]"
            />
            {errors.amount && <FieldError>{errors.amount}</FieldError>}
          </label>
          <label className="text-xs font-semibold text-[var(--color-muted-strong)]">
            Fecha
            <input
              type="date"
              value={expense.date}
              onChange={(event) => onChange({ ...expense, date: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-border-strong)] px-2 text-sm font-normal text-[var(--color-ink)]"
            />
            {errors.date && <FieldError>{errors.date}</FieldError>}
          </label>
        </div>
        <label className="text-xs font-semibold text-[var(--color-muted-strong)]">
          Método de pago
          <select
            value={expense.paymentMethod}
            onChange={(event) => onChange({ ...expense, paymentMethod: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-normal text-[var(--color-ink)]"
          >
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
          {errors.paymentMethod && <FieldError>{errors.paymentMethod}</FieldError>}
        </label>
        <button
          disabled={isSaving}
          className="mt-1 h-10 rounded-md bg-[var(--color-ink)] text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar gasto"}
        </button>
      </form>
    </article>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-[11px] font-medium text-[#b04b43]">{children}</span>;
}

function PerformanceList({
  rows,
  title
}: {
  rows: Array<{ details: string[]; id: string; title: string; value: string }>;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-white p-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-2.5 divide-y divide-[var(--color-border)]">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">
            Todavía no hay datos suficientes para este período.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{row.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {row.details.map((detail) => (
                    <span key={detail} className="inline-flex items-center rounded-md bg-[rgba(32,24,54,0.04)] px-1.5 py-0.5 text-[10px] leading-4 text-[var(--color-muted-strong)]">
                      {detail}
                    </span>
                  ))}
                </div>
              </div>
              <span className="justify-self-start whitespace-nowrap font-mono text-xs font-semibold text-[var(--color-ink)] sm:justify-self-end">
                {row.value}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
