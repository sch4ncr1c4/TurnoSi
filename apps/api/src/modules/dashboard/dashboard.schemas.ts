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

export const createExpenseSchema = z.object({
  description: z.string().trim().min(2).max(160),
  amountCents: z.number().int().positive().max(1_000_000_000),
  category: z.string().trim().min(2).max(80),
  occurredOn: z.string().datetime()
}).strict();

export const expenseParamsSchema = z.object({
  expenseId: z.string().cuid()
});
