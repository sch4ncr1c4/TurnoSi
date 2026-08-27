import { z } from "zod";

export const dashboardPeriodSchema = z.enum([
  "7d",
  "30d",
  "current_month",
  "previous_month"
]);

export const dashboardSummaryQuerySchema = z.object({
  period: dashboardPeriodSchema.default("30d")
}).strict();

export const dashboardExpensesQuerySchema = z.object({
  period: dashboardPeriodSchema.default("current_month")
}).strict();

const dashboardDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}, "Invalid date");

export const dailyClosingPdfQuerySchema = z.object({
  date: dashboardDateSchema
}).strict();

export const analyticsReportPdfQuerySchema = z.object({
  from: dashboardDateSchema,
  to: dashboardDateSchema
}).strict().superRefine(({ from, to }, context) => {
  if (from > to) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "From date must not be after to date", path: ["from"] });
    return;
  }
  const days = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000 + 1;
  if (days > 366) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Date range cannot exceed 366 days", path: ["to"] });
  }
});

export const createExpenseSchema = z.object({
  description: z.string().trim().min(2).max(160),
  amountCents: z.number().int().positive().max(1_000_000_000),
  category: z.string().trim().min(2).max(80),
  paymentMethod: z.enum(["cash", "bank_transfer", "mercadopago", "other"]).optional(),
  occurredOn: z.string().datetime()
}).strict();

export const expenseParamsSchema = z.object({
  expenseId: z.string().cuid()
});
