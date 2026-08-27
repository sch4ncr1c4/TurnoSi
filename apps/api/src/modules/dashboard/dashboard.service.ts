import { Prisma } from "@prisma/client";
import PDFDocument from "pdfkit";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { zonedTimeToUtc } from "../../lib/timezone.js";

export type DashboardPeriod = "7d" | "30d" | "current_month" | "previous_month";

type MetricsRow = {
  appointmentCount: bigint;
  completedCount: bigint;
  confirmedCount: bigint;
  depositedCount: bigint;
  pendingCount: bigint;
  canceledCount: bigint;
  noShowCount: bigint;
  revenueAppointmentCount: bigint;
  completedIncomeCents: bigint;
  depositIncomeCents: bigint;
  pendingCollectionCents: bigint;
  incomeCents: bigint;
};

type MetricValues = {
  appointmentCount: number;
  completedCount: number;
  confirmedCount: number;
  depositedCount: number;
  pendingCount: number;
  canceledCount: number;
  noShowCount: number;
  revenueAppointmentCount: number;
  completedIncomeCents: number;
  depositIncomeCents: number;
  pendingCollectionCents: number;
  incomeCents: number;
};

type DailyClosingSale = {
  amountCents: number;
  client: string;
  payment: string;
  service: string;
  status: string;
  time: string;
};

type DailyClosingExpense = {
  amountCents: number;
  category: string;
  description: string;
};

function localDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function localTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: timezone
  }).format(date);
}

function localLongDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function money(cents: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(cents / 100);
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function nextMonth(date: string) {
  const value = new Date(`${monthStart(date)}T12:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
}

export function dashboardRanges(period: DashboardPeriod, timezone: string, now = new Date()) {
  const today = localDate(now, timezone);
  const currentMonthStart = monthStart(today);
  const currentMonthEnd = nextMonth(today);
  const previousMonthStart = shiftDate(currentMonthStart, -1).slice(0, 7) + "-01";
  const previousPreviousMonthStart = shiftDate(previousMonthStart, -1).slice(0, 7) + "-01";
  const chartStart = period === "7d"
    ? shiftDate(today, -6)
    : period === "30d"
      ? shiftDate(today, -29)
      : period === "previous_month"
        ? previousMonthStart
        : currentMonthStart;
  const chartEnd = period === "previous_month" ? currentMonthStart : shiftDate(today, 1);
  const dayCount = Math.round(
    (new Date(`${chartEnd}T12:00:00.000Z`).getTime() - new Date(`${chartStart}T12:00:00.000Z`).getTime()) /
      86_400_000
  );
  const previousStart = period === "previous_month"
    ? previousPreviousMonthStart
    : shiftDate(chartStart, -dayCount);
  const previousEnd = chartStart;
  return {
    today: {
      from: zonedTimeToUtc(today, 0, timezone),
      to: zonedTimeToUtc(shiftDate(today, 1), 0, timezone)
    },
    currentMonth: {
      from: zonedTimeToUtc(currentMonthStart, 0, timezone),
      to: zonedTimeToUtc(currentMonthEnd, 0, timezone)
    },
    previousMonth: {
      from: zonedTimeToUtc(previousMonthStart, 0, timezone),
      to: zonedTimeToUtc(currentMonthStart, 0, timezone)
    },
    selected: {
      from: zonedTimeToUtc(chartStart, 0, timezone),
      to: zonedTimeToUtc(chartEnd, 0, timezone)
    },
    selectedPrevious: {
      from: zonedTimeToUtc(previousStart, 0, timezone),
      to: zonedTimeToUtc(previousEnd, 0, timezone)
    },
    chart: {
      from: zonedTimeToUtc(chartStart, 0, timezone),
      to: zonedTimeToUtc(chartEnd, 0, timezone),
      localFrom: chartStart,
      localTo: chartEnd
    }
  };
}

const recognizedIncomeSql = Prisma.sql`
  CASE
    WHEN a."status" IN ('paid', 'completed') THEN COALESCE(s."priceCents", 0)
    WHEN dp."status" = 'approved' THEN dp."amountCents"
    ELSE 0
  END
`;

async function metricsForRanges(
  organizationId: string,
  ranges: { selected: { from: Date; to: Date }; selectedPrevious: { from: Date; to: Date }; today: { from: Date; to: Date } }
) {
  const rows = await prisma.$queryRaw<Array<MetricsRow & { label: string }>>(Prisma.sql`
    WITH ranges(label, "from", "to") AS (VALUES
      ('current', ${ranges.selected.from}::timestamp, ${ranges.selected.to}::timestamp),
      ('previous', ${ranges.selectedPrevious.from}::timestamp, ${ranges.selectedPrevious.to}::timestamp),
      ('today', ${ranges.today.from}::timestamp, ${ranges.today.to}::timestamp)
    )
    SELECT
      r.label,
      COUNT(*) FILTER (WHERE a."status" NOT IN ('canceled', 'no_show')) AS "appointmentCount",
      COUNT(*) FILTER (WHERE a."status" IN ('paid', 'completed')) AS "completedCount",
      COUNT(*) FILTER (WHERE a."status" = 'confirmed') AS "confirmedCount",
      COUNT(*) FILTER (WHERE dp."status" = 'approved') AS "depositedCount",
      COUNT(*) FILTER (WHERE a."status" = 'pending') AS "pendingCount",
      COUNT(*) FILTER (WHERE a."status" = 'canceled') AS "canceledCount",
      COUNT(*) FILTER (WHERE a."status" = 'no_show') AS "noShowCount",
      COUNT(*) FILTER (WHERE a."status" IN ('paid', 'completed') OR dp."status" = 'approved') AS "revenueAppointmentCount",
      COALESCE(SUM(CASE WHEN a."status" IN ('paid', 'completed') THEN COALESCE(s."priceCents", 0) ELSE 0 END), 0)::bigint AS "completedIncomeCents",
      COALESCE(SUM(CASE WHEN dp."status" = 'approved' THEN dp."amountCents" ELSE 0 END), 0)::bigint AS "depositIncomeCents",
      COALESCE(SUM(
        CASE
          WHEN a."status" IN ('pending', 'confirmed') THEN GREATEST(COALESCE(s."priceCents", 0) - CASE WHEN dp."status" = 'approved' THEN dp."amountCents" ELSE 0 END, 0)
          ELSE 0
        END
      ), 0)::bigint AS "pendingCollectionCents",
      COALESCE(SUM(${recognizedIncomeSql}), 0)::bigint AS "incomeCents"
    FROM ranges r
    LEFT JOIN "Appointment" a ON a."organizationId" = ${organizationId}
      AND a."deletedAt" IS NULL AND a."startsAt" >= r."from" AND a."startsAt" < r."to"
    LEFT JOIN "Service" s ON s."id" = a."serviceId"
    LEFT JOIN "AppointmentDepositPayment" dp ON dp."appointmentId" = a."id"
    GROUP BY r.label
  `);
  const normalize = (row?: MetricsRow) => ({
    appointmentCount: Number(row?.appointmentCount ?? 0),
    completedCount: Number(row?.completedCount ?? 0),
    confirmedCount: Number(row?.confirmedCount ?? 0),
    depositedCount: Number(row?.depositedCount ?? 0),
    pendingCount: Number(row?.pendingCount ?? 0),
    canceledCount: Number(row?.canceledCount ?? 0),
    noShowCount: Number(row?.noShowCount ?? 0),
    revenueAppointmentCount: Number(row?.revenueAppointmentCount ?? 0),
    completedIncomeCents: Number(row?.completedIncomeCents ?? 0),
    depositIncomeCents: Number(row?.depositIncomeCents ?? 0),
    pendingCollectionCents: Number(row?.pendingCollectionCents ?? 0),
    incomeCents: Number(row?.incomeCents ?? 0)
  });
  return {
    current: normalize(rows.find((row) => row.label === "current")),
    previous: normalize(rows.find((row) => row.label === "previous")),
    today: normalize(rows.find((row) => row.label === "today"))
  };
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function appointmentStatusLabel(status: string) {
  if (status === "pending") return "Pendiente";
  if (status === "confirmed") return "Confirmado";
  if (status === "paid") return "Completado";
  if (status === "completed") return "Completado";
  if (status === "canceled") return "Cancelado";
  if (status === "no_show") return "No asistió";
  return "Pendiente";
}

function paymentMethodLabel(method?: string | null) {
  if (method === "cash") return "Efectivo";
  if (method === "bank_transfer") return "Transferencia";
  if (method === "mercadopago") return "Mercado Pago";
  if (method === "other") return "Otro";
  return "Sin método";
}

function paymentStatusLabel(
  status: string,
  depositPayment?: { amountCents: number; method: string | null; status: string } | null
) {
  if (status === "paid" || status === "completed") return "Pagado";
  if (depositPayment?.status === "approved") return "Seña pagada";
  if (depositPayment?.status === "pending") return "Seña pendiente";
  if (depositPayment?.status === "rejected") return "Seña rechazada";
  if (depositPayment?.status === "cancelled") return "Seña vencida";
  return "Sin pago";
}

export function deriveDashboardMetrics(
  current: MetricValues,
  previous: MetricValues,
  expenseCents: number,
  previousExpenseCents: number
) {
  const totalScheduled = current.appointmentCount + current.canceledCount + current.noShowCount;
  const previousScheduled = previous.appointmentCount + previous.canceledCount + previous.noShowCount;
  const averageTicketCents = current.completedCount ? Math.round(current.completedIncomeCents / current.completedCount) : 0;
  const previousAverageTicketCents = previous.completedCount ? Math.round(previous.completedIncomeCents / previous.completedCount) : 0;
  const occupancyPercent = percent(current.completedCount + current.confirmedCount, totalScheduled);
  const previousOccupancyPercent = percent(previous.completedCount + previous.confirmedCount, previousScheduled);
  const cancellationRatePercent = percent(current.canceledCount, totalScheduled);
  const previousCancellationRatePercent = percent(previous.canceledCount, previousScheduled);
  const noShowRatePercent = percent(current.noShowCount, totalScheduled);
  const previousNoShowRatePercent = percent(previous.noShowCount, previousScheduled);
  return {
    incomeCents: current.incomeCents,
    expenseCents,
    netIncomeCents: current.incomeCents - expenseCents,
    totalAppointments: totalScheduled,
    completedAppointments: current.completedCount,
    averageTicketCents,
    occupancyPercent,
    cancellationRatePercent,
    noShowRatePercent,
    confirmedAppointments: current.confirmedCount,
    depositedAppointments: current.depositedCount,
    depositIncomeCents: current.depositIncomeCents,
    pendingCollectionCents: current.pendingCollectionCents,
    pendingAppointments: current.pendingCount,
    canceledAppointments: current.canceledCount,
    noShowAppointments: current.noShowCount,
    changes: {
      incomePercent: percentageChange(current.incomeCents, previous.incomeCents),
      expensePercent: percentageChange(expenseCents, previousExpenseCents),
      netIncomePercent: percentageChange(current.incomeCents - expenseCents, previous.incomeCents - previousExpenseCents),
      completedPercent: percentageChange(current.completedCount, previous.completedCount),
      averageTicketPercent: percentageChange(averageTicketCents, previousAverageTicketCents),
      occupancyPercent: percentageChange(occupancyPercent, previousOccupancyPercent),
      cancellationRatePercent: percentageChange(cancellationRatePercent, previousCancellationRatePercent),
      noShowRatePercent: percentageChange(noShowRatePercent, previousNoShowRatePercent)
    }
  };
}

export async function getDashboardSummary(
  organizationId: string,
  timezone: string,
  period: DashboardPeriod
) {
  const ranges = dashboardRanges(period, timezone);
  const [periodMetrics, expenseTotals, chart, services, team, memberCount, upcomingAppointments, todayRevenueAppointments, todayExpenses] =
    await Promise.all([
      metricsForRanges(organizationId, ranges),
      prisma.$queryRaw<Array<{ currentCents: bigint; previousCents: bigint }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(e."amountCents") FILTER (WHERE e."occurredOn" >= ${ranges.selected.from} AND e."occurredOn" < ${ranges.selected.to}), 0)::bigint AS "currentCents",
          COALESCE(SUM(e."amountCents") FILTER (WHERE e."occurredOn" >= ${ranges.selectedPrevious.from} AND e."occurredOn" < ${ranges.selectedPrevious.to}), 0)::bigint AS "previousCents"
        FROM "Expense" e WHERE e."organizationId" = ${organizationId}
      `),
      prisma.$queryRaw<Array<{ date: string; incomeCents: bigint; expenseCents: bigint }>>(Prisma.sql`
        WITH days AS (
          SELECT generate_series(
            ${ranges.chart.localFrom}::date,
            (${ranges.chart.localTo}::date - 1),
            interval '1 day'
          )::date AS date
        ), income AS (
          SELECT (a."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date AS date,
                 SUM(${recognizedIncomeSql})::bigint AS amount
          FROM "Appointment" a
          JOIN "Service" s ON s."id" = a."serviceId"
          LEFT JOIN "AppointmentDepositPayment" dp ON dp."appointmentId" = a."id"
          WHERE a."organizationId" = ${organizationId} AND a."deletedAt" IS NULL
            AND a."startsAt" >= ${ranges.chart.from} AND a."startsAt" < ${ranges.chart.to}
          GROUP BY 1
        ), expense AS (
          SELECT (e."occurredOn" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date AS date,
                 SUM(e."amountCents")::bigint AS amount
          FROM "Expense" e
          WHERE e."organizationId" = ${organizationId}
            AND e."occurredOn" >= ${ranges.chart.from} AND e."occurredOn" < ${ranges.chart.to}
          GROUP BY 1
        )
        SELECT to_char(d.date, 'YYYY-MM-DD') AS date, COALESCE(i.amount, 0)::bigint AS "incomeCents",
               COALESCE(e.amount, 0)::bigint AS "expenseCents"
        FROM days d LEFT JOIN income i USING (date) LEFT JOIN expense e USING (date)
        ORDER BY d.date
      `),
      prisma.$queryRaw<Array<{ serviceId: string; name: string; appointmentCount: bigint; incomeCents: bigint }>>(Prisma.sql`
        SELECT s."id" AS "serviceId", s."name",
               COUNT(*) FILTER (WHERE a."status" NOT IN ('canceled', 'no_show')) AS "appointmentCount",
               COALESCE(SUM(${recognizedIncomeSql}), 0)::bigint AS "incomeCents"
        FROM "Appointment" a JOIN "Service" s ON s."id" = a."serviceId"
        LEFT JOIN "AppointmentDepositPayment" dp ON dp."appointmentId" = a."id"
        WHERE a."organizationId" = ${organizationId} AND a."deletedAt" IS NULL
          AND a."startsAt" >= ${ranges.selected.from} AND a."startsAt" < ${ranges.selected.to}
        GROUP BY s."id", s."name" ORDER BY "incomeCents" DESC LIMIT 5
      `),
      prisma.$queryRaw<Array<{ userId: string; name: string; appointmentCount: bigint; incomeCents: bigint }>>(Prisma.sql`
        SELECT u."id" AS "userId",
               COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u."firstName", u."lastName")), ''), u."email") AS name,
               COUNT(a."id") FILTER (WHERE a."status" IN ('paid', 'completed')) AS "appointmentCount",
               COALESCE(SUM(${recognizedIncomeSql}), 0)::bigint AS "incomeCents"
        FROM "Membership" m JOIN "User" u ON u."id" = m."userId"
        LEFT JOIN "Appointment" a ON a."assignedUserId" = u."id"
          AND a."organizationId" = m."organizationId" AND a."deletedAt" IS NULL
          AND a."startsAt" >= ${ranges.selected.from} AND a."startsAt" < ${ranges.selected.to}
        LEFT JOIN "Service" s ON s."id" = a."serviceId"
        LEFT JOIN "AppointmentDepositPayment" dp ON dp."appointmentId" = a."id"
        WHERE m."organizationId" = ${organizationId}
        GROUP BY u."id", u."firstName", u."lastName", u."email"
        ORDER BY "incomeCents" DESC LIMIT 8
      `),
      prisma.membership.count({ where: { organizationId } }),
      prisma.appointment.findMany({
        where: {
          organizationId,
          deletedAt: null,
          startsAt: { gte: new Date(), lt: ranges.today.to }
        },
        orderBy: { startsAt: "asc" },
        take: 6,
        select: {
          id: true,
          startsAt: true,
          status: true,
          confirmedByBusinessAt: true,
          customer: { select: { fullName: true } },
          depositPayment: { select: { amountCents: true, method: true, status: true } },
          service: { select: { name: true, priceCents: true } },
          assignedUser: { select: { email: true, firstName: true, lastName: true } }
        }
      }),
      prisma.appointment.findMany({
        where: {
          organizationId,
          deletedAt: null,
          startsAt: { gte: ranges.today.from, lt: ranges.today.to },
          OR: [
            { status: { in: ["paid", "completed"] } },
            { depositPayment: { status: "approved" } }
          ]
        },
        orderBy: { startsAt: "asc" },
        select: {
          startsAt: true,
          status: true,
          depositPayment: { select: { amountCents: true, method: true, status: true } },
          service: { select: { name: true, priceCents: true } }
        }
      }),
      prisma.expense.findMany({
        where: { organizationId, occurredOn: { gte: ranges.today.from, lt: ranges.today.to } },
        orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: { amountCents: true, category: true, description: true, occurredOn: true, paymentMethod: true }
      })
    ]);

  const { current, previous, today } = periodMetrics;
  const expenseCents = Number(expenseTotals[0]?.currentCents ?? 0);
  const previousExpenseCents = Number(expenseTotals[0]?.previousCents ?? 0);
  const todayExpenseCents = todayExpenses.reduce((sum, item) => sum + item.amountCents, 0);
  const todayNetIncomeCents = today.incomeCents - todayExpenseCents;
  const paymentMethods = new Map<string, number>();
  const todayIncomeMovements = todayRevenueAppointments
    .filter((appointment) => appointment.status === "paid" || appointment.status === "completed" || appointment.depositPayment?.status === "approved")
    .map((appointment) => {
      const isPaid = appointment.status === "paid" || appointment.status === "completed";
      const amountCents = isPaid ? appointment.service.priceCents ?? 0 : appointment.depositPayment?.amountCents ?? 0;
      const method = isPaid ? "Turno cobrado" : paymentMethodLabel(appointment.depositPayment?.method);
      paymentMethods.set(method, (paymentMethods.get(method) ?? 0) + amountCents);
      return {
        amountCents,
        concept: isPaid ? appointment.service.name : `Seña · ${appointment.service.name}`,
        description: isPaid ? appointment.service.name : `Seña · ${appointment.service.name}`,
        kind: "income" as const,
        label: method,
        method,
        sortAt: appointment.startsAt.toISOString(),
        time: localTime(appointment.startsAt, timezone)
      };
    })
    .filter((movement) => movement.amountCents > 0);
  return {
    period,
    metrics: deriveDashboardMetrics(current, previous, expenseCents, previousExpenseCents),
    today: {
      appointments: today.appointmentCount + today.canceledCount + today.noShowCount,
      estimatedIncomeCents: today.incomeCents,
      expenseCents: todayExpenseCents,
      netIncomeCents: todayNetIncomeCents,
      confirmed: today.confirmedCount,
      completed: today.completedCount,
      deposited: today.depositedCount,
      pending: today.pendingCount,
      canceled: today.canceledCount,
      noShow: today.noShowCount,
      paymentMethods: Array.from(paymentMethods, ([method, amountCents]) => ({ amountCents, method })),
      movements: [
        ...todayIncomeMovements.slice(0, 5),
        ...todayExpenses.map((expense) => ({
          amountCents: expense.amountCents,
          concept: expense.description,
          description: expense.description,
          kind: "expense" as const,
          label: expense.category,
          method: paymentMethodLabel(expense.paymentMethod),
          sortAt: expense.occurredOn.toISOString(),
          time: localTime(expense.occurredOn, timezone)
        }))
      ].sort((a, b) => a.sortAt.localeCompare(b.sortAt)).slice(0, 8),
      upcoming: upcomingAppointments.map((appointment) => {
        const assigneeName = appointment.assignedUser
          ? [appointment.assignedUser.firstName, appointment.assignedUser.lastName].filter(Boolean).join(" ").trim() ||
            appointment.assignedUser.email
          : "Sin asignar";
        return {
          id: appointment.id,
          time: localTime(appointment.startsAt, timezone),
          client: appointment.customer.fullName,
          service: appointment.service.name,
          professional: assigneeName,
          status: appointmentStatusLabel(appointment.status),
          paymentStatus: paymentStatusLabel(appointment.status, appointment.depositPayment),
          paymentMethod: paymentMethodLabel(appointment.depositPayment?.method),
          depositAmountCents: appointment.depositPayment?.amountCents ?? null
        };
      })
    },
    chart: chart.map((item) => ({
      date: item.date,
      incomeCents: Number(item.incomeCents),
      expenseCents: Number(item.expenseCents)
    })),
    services: services.map((item) => ({
      id: item.serviceId,
      name: item.name,
      appointments: Number(item.appointmentCount),
      incomeCents: Number(item.incomeCents),
      averageTicketCents: Number(item.appointmentCount) ? Math.round(Number(item.incomeCents) / Number(item.appointmentCount)) : 0,
      incomeSharePercent: current.incomeCents
        ? Math.round((Number(item.incomeCents) / current.incomeCents) * 1000) / 10
        : 0
    })),
    team: memberCount > 1 ? team.map((item) => ({
      id: item.userId,
      name: item.name,
      completedAppointments: Number(item.appointmentCount),
      incomeCents: Number(item.incomeCents),
      averageTicketCents: Number(item.appointmentCount) ? Math.round(Number(item.incomeCents) / Number(item.appointmentCount)) : 0,
      occupancyPercent: current.completedCount
        ? Math.round((Number(item.appointmentCount) / current.completedCount) * 1000) / 10
        : 0
    })) : []
  };
}

export async function getDashboardExpenses(
  organizationId: string,
  timezone: string,
  period: DashboardPeriod
) {
  const ranges = dashboardRanges(period, timezone);
  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      occurredOn: {
        gte: ranges.chart.from,
        lt: ranges.chart.to
      }
    },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      description: true,
      amountCents: true,
      category: true,
      paymentMethod: true,
      occurredOn: true,
      createdAt: true
    }
  });

  return expenses.map((expense) => ({
    ...expense,
    occurredOn: expense.occurredOn.toISOString(),
    createdAt: expense.createdAt.toISOString()
  }));
}

export async function getDailyClosingData(
  organizationId: string,
  timezone: string,
  date: string
) {
  if (date > localDate(new Date(), timezone)) {
    throw new AppError(400, "FUTURE_CLOSING_DATE", "Cannot generate a cash closing for a future date");
  }

  const from = zonedTimeToUtc(date, 0, timezone);
  const to = zonedTimeToUtc(shiftDate(date, 1), 0, timezone);
  const [organization, appointments, expenses] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, slug: true }
    }),
    prisma.appointment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        startsAt: { gte: from, lt: to },
        OR: [
          { status: { in: ["paid", "completed"] } },
          { depositPayment: { status: "approved" } }
        ]
      },
      orderBy: { startsAt: "asc" },
      select: {
        startsAt: true,
        status: true,
        customer: { select: { fullName: true } },
        depositPayment: { select: { amountCents: true, method: true, status: true } },
        service: { select: { name: true, priceCents: true } }
      }
    }),
    prisma.expense.findMany({
      where: { organizationId, occurredOn: { gte: from, lt: to } },
      orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
      select: { amountCents: true, category: true, description: true }
    })
  ]);

  const sales: DailyClosingSale[] = appointments.map((appointment) => {
    const isFullSale = appointment.status === "paid" || appointment.status === "completed";
    const deposit = appointment.depositPayment?.status === "approved"
      ? appointment.depositPayment
      : null;
    return {
      amountCents: isFullSale ? appointment.service.priceCents ?? 0 : deposit?.amountCents ?? 0,
      client: appointment.customer.fullName,
      payment: isFullSale ? "Turno cobrado" : `Seña${deposit?.method ? ` · ${deposit.method}` : ""}`,
      service: appointment.service.name,
      status: appointment.status,
      time: localTime(appointment.startsAt, timezone)
    };
  }).filter((sale) => sale.amountCents > 0);

  const detailedExpenses: DailyClosingExpense[] = expenses.map((expense) => ({
    amountCents: expense.amountCents,
    category: expense.category,
    description: expense.description
  }));
  const grossIncomeCents = sales.reduce((sum, item) => sum + item.amountCents, 0);
  const expenseCents = detailedExpenses.reduce((sum, item) => sum + item.amountCents, 0);

  return {
    date,
    expenses: detailedExpenses,
    expenseCents,
    generatedAt: new Date(),
    grossIncomeCents,
    netIncomeCents: grossIncomeCents - expenseCents,
    organizationName: organization?.name ?? organization?.slug ?? "Negocio",
    sales,
    timezone
  };
}

function writePdfRow(
  doc: PDFKit.PDFDocument,
  columns: Array<{ text: string; width: number; align?: "left" | "right" }>,
  y: number
) {
  let x = doc.page.margins.left;
  for (const column of columns) {
    doc.text(column.text, x, y, { align: column.align ?? "left", width: column.width });
    x += column.width;
  }
}

function ensurePdfSpace(doc: PDFKit.PDFDocument, y: number, needed = 48) {
  if (y + needed <= doc.page.height - doc.page.margins.bottom) return y;
  doc.addPage();
  return doc.page.margins.top;
}

export async function renderDailyClosingPdf(
  organizationId: string,
  timezone: string,
  date: string
) {
  const closing = await getDailyClosingData(organizationId, timezone, date);
  const doc = new PDFDocument({
    bufferPages: true,
    info: {
      Author: "TurnoSi",
      Subject: `Cierre diario ${closing.date}`,
      Title: `Cierre de caja - ${closing.organizationName}`
    },
    margin: 42,
    size: "A4"
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.font("Helvetica-Bold").fontSize(18).text("Cierre de caja diario");
  doc.font("Helvetica").fontSize(10).fillColor("#5f596b")
    .text(closing.organizationName)
    .text(`Fecha: ${localLongDate(closing.date)}`)
    .text(`Generado: ${localTime(closing.generatedAt, closing.timezone)} hs`);

  let y = doc.y + 18;
  const summary = [
    ["Ventas brutas", money(closing.grossIncomeCents)],
    ["Gastos", money(closing.expenseCents)],
    ["Ganancia neta", money(closing.netIncomeCents)]
  ];
  for (const [index, [label, value]] of summary.entries()) {
    const x = 42 + index * 170;
    doc.roundedRect(x, y, 158, 54, 8).fillAndStroke("#fbfaf8", "#ded9e3");
    doc.fillColor("#5f596b").font("Helvetica").fontSize(9).text(label, x + 14, y + 10);
    doc.fillColor("#160f33").font("Helvetica-Bold").fontSize(15).text(value, x + 14, y + 26);
  }
  y += 78;

  doc.fillColor("#160f33").font("Helvetica-Bold").fontSize(13).text("Ventas detalladas", 42, y);
  y += 24;
  doc.fontSize(9).fillColor("#5f596b");
  writePdfRow(doc, [
    { text: "Hora", width: 52 },
    { text: "Servicio", width: 150 },
    { text: "Cliente", width: 130 },
    { text: "Detalle", width: 110 },
    { text: "Importe", width: 70, align: "right" }
  ], y);
  y += 16;
  doc.moveTo(42, y).lineTo(553, y).strokeColor("#ded9e3").stroke();
  y += 8;

  if (closing.sales.length === 0) {
    doc.font("Helvetica").fillColor("#5f596b").text("Sin ventas registradas.", 42, y);
    y += 24;
  } else {
    for (const sale of closing.sales) {
      y = ensurePdfSpace(doc, y);
      doc.font("Helvetica").fontSize(9).fillColor("#160f33");
      writePdfRow(doc, [
        { text: sale.time, width: 52 },
        { text: sale.service, width: 150 },
        { text: sale.client, width: 130 },
        { text: sale.payment, width: 110 },
        { text: money(sale.amountCents), width: 70, align: "right" }
      ], y);
      y += 22;
    }
  }

  y = ensurePdfSpace(doc, y + 12, 80);
  doc.fillColor("#160f33").font("Helvetica-Bold").fontSize(13).text("Gastos detallados", 42, y);
  y += 24;
  doc.fontSize(9).fillColor("#5f596b");
  writePdfRow(doc, [
    { text: "Categoria", width: 120 },
    { text: "Descripcion", width: 320 },
    { text: "Importe", width: 72, align: "right" }
  ], y);
  y += 16;
  doc.moveTo(42, y).lineTo(553, y).strokeColor("#ded9e3").stroke();
  y += 8;

  if (closing.expenses.length === 0) {
    doc.font("Helvetica").fillColor("#5f596b").text("Sin gastos registrados.", 42, y);
  } else {
    for (const expense of closing.expenses) {
      y = ensurePdfSpace(doc, y);
      doc.font("Helvetica").fontSize(9).fillColor("#160f33");
      writePdfRow(doc, [
        { text: expense.category, width: 120 },
        { text: expense.description, width: 320 },
        { text: money(expense.amountCents), width: 72, align: "right" }
      ], y);
      y += 22;
    }
  }

  doc.end();
  return done;
}
