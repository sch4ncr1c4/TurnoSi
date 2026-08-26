import { Prisma } from "@prisma/client";

import { prisma } from "../../database/prisma.js";
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
  incomeCents: bigint;
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
  const chartStart = period === "7d"
    ? shiftDate(today, -6)
    : period === "30d"
      ? shiftDate(today, -29)
      : period === "previous_month"
        ? previousMonthStart
        : currentMonthStart;
  const chartEnd = period === "previous_month" ? currentMonthStart : shiftDate(today, 1);
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
  ranges: { currentMonth: { from: Date; to: Date }; previousMonth: { from: Date; to: Date }; today: { from: Date; to: Date } }
) {
  const rows = await prisma.$queryRaw<Array<MetricsRow & { label: string }>>(Prisma.sql`
    WITH ranges(label, "from", "to") AS (VALUES
      ('current', ${ranges.currentMonth.from}::timestamp, ${ranges.currentMonth.to}::timestamp),
      ('previous', ${ranges.previousMonth.from}::timestamp, ${ranges.previousMonth.to}::timestamp),
      ('today', ${ranges.today.from}::timestamp, ${ranges.today.to}::timestamp)
    )
    SELECT
      r.label,
      COUNT(*) FILTER (WHERE a."status" NOT IN ('canceled', 'no_show')) AS "appointmentCount",
      COUNT(*) FILTER (WHERE a."status" IN ('paid', 'completed')) AS "completedCount",
      COUNT(*) FILTER (
        WHERE a."status" = 'confirmed'
          AND (
            a."confirmedByBusinessAt" IS NOT NULL
            OR dp."status" IS DISTINCT FROM 'approved'
          )
      ) AS "confirmedCount",
      COUNT(*) FILTER (
        WHERE a."status" = 'confirmed'
          AND dp."status" = 'approved'
          AND a."confirmedByBusinessAt" IS NULL
      ) AS "depositedCount",
      COUNT(*) FILTER (WHERE a."status" = 'pending') AS "pendingCount",
      COUNT(*) FILTER (WHERE a."status" = 'canceled') AS "canceledCount",
      COUNT(*) FILTER (WHERE a."status" = 'no_show') AS "noShowCount",
      COUNT(*) FILTER (WHERE a."status" IN ('paid', 'completed') OR dp."status" = 'approved') AS "revenueAppointmentCount",
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

export function deriveDashboardMetrics(
  current: { appointmentCount: number; completedCount: number; confirmedCount: number; depositedCount: number; pendingCount: number; canceledCount: number; noShowCount: number; revenueAppointmentCount: number; incomeCents: number },
  previous: { completedCount: number; incomeCents: number },
  expenseCents: number,
  previousExpenseCents: number
) {
  const totalScheduled = current.appointmentCount + current.canceledCount + current.noShowCount;
  return {
    incomeCents: current.incomeCents,
    expenseCents,
    netIncomeCents: current.incomeCents - expenseCents,
    completedAppointments: current.completedCount,
    averageTicketCents: current.revenueAppointmentCount ? Math.round(current.incomeCents / current.revenueAppointmentCount) : 0,
    occupancyPercent: totalScheduled
      ? Math.round(((current.completedCount + current.confirmedCount + current.depositedCount) / totalScheduled) * 1000) / 10
      : 0,
    confirmedAppointments: current.confirmedCount,
    depositedAppointments: current.depositedCount,
    pendingAppointments: current.pendingCount,
    canceledAppointments: current.canceledCount,
    noShowAppointments: current.noShowCount,
    changes: {
      incomePercent: percentageChange(current.incomeCents, previous.incomeCents),
      expensePercent: percentageChange(expenseCents, previousExpenseCents),
      completedPercent: percentageChange(current.completedCount, previous.completedCount)
    }
  };
}

export async function getDashboardSummary(
  organizationId: string,
  timezone: string,
  period: DashboardPeriod
) {
  const ranges = dashboardRanges(period, timezone);
  const [periodMetrics, expenseTotals, chart, services, team, memberCount] =
    await Promise.all([
      metricsForRanges(organizationId, ranges),
      prisma.$queryRaw<Array<{ currentCents: bigint; previousCents: bigint }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(e."amountCents") FILTER (WHERE e."occurredOn" >= ${ranges.currentMonth.from} AND e."occurredOn" < ${ranges.currentMonth.to}), 0)::bigint AS "currentCents",
          COALESCE(SUM(e."amountCents") FILTER (WHERE e."occurredOn" >= ${ranges.previousMonth.from} AND e."occurredOn" < ${ranges.previousMonth.to}), 0)::bigint AS "previousCents"
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
          AND a."startsAt" >= ${ranges.currentMonth.from} AND a."startsAt" < ${ranges.currentMonth.to}
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
          AND a."startsAt" >= ${ranges.currentMonth.from} AND a."startsAt" < ${ranges.currentMonth.to}
        LEFT JOIN "Service" s ON s."id" = a."serviceId"
        LEFT JOIN "AppointmentDepositPayment" dp ON dp."appointmentId" = a."id"
        WHERE m."organizationId" = ${organizationId}
        GROUP BY u."id", u."firstName", u."lastName", u."email"
        ORDER BY "incomeCents" DESC LIMIT 8
      `),
      prisma.membership.count({ where: { organizationId } })
    ]);

  const { current, previous, today } = periodMetrics;
  const expenseCents = Number(expenseTotals[0]?.currentCents ?? 0);
  const previousExpenseCents = Number(expenseTotals[0]?.previousCents ?? 0);
  return {
    period,
    metrics: deriveDashboardMetrics(current, previous, expenseCents, previousExpenseCents),
    today: {
      appointments: today.appointmentCount,
      estimatedIncomeCents: today.incomeCents,
      confirmed: today.confirmedCount,
      deposited: today.depositedCount,
      pending: today.pendingCount,
      canceled: today.canceledCount
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
      incomeSharePercent: current.incomeCents
        ? Math.round((Number(item.incomeCents) / current.incomeCents) * 1000) / 10
        : 0
    })),
    team: memberCount > 1 ? team.map((item) => ({
      id: item.userId,
      name: item.name,
      completedAppointments: Number(item.appointmentCount),
      incomeCents: Number(item.incomeCents),
      occupancyPercent: current.completedCount
        ? Math.round((Number(item.appointmentCount) / current.completedCount) * 1000) / 10
        : 0
    })) : []
  };
}
