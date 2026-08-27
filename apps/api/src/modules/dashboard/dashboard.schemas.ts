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

export const dailyClosingPdfQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  }, "Invalid date")
}).strict();

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
