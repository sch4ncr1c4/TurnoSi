import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { ok } from "../../lib/http.js";
import { requireEditor } from "../../lib/membership.js";
import { authenticatedRateLimit } from "../../middlewares/rate-limit.js";
import { auditLog } from "../audit/audit.service.js";
import {
  analyticsReportPdfQuerySchema,
  createExpenseSchema,
  dashboardExpensesQuerySchema,
  dashboardSummaryQuerySchema,
  dailyClosingPdfQuerySchema,
  expenseParamsSchema
} from "./dashboard.schemas.js";
import {
  getDashboardExpenses,
  getDashboardSummary,
  renderAnalyticsReportPdf,
  renderDailyClosingPdf
} from "./dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", authenticatedRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { period } = dashboardSummaryQuerySchema.parse(request.query);
  response.json(ok(await getDashboardSummary(tenant.organizationId, tenant.timezone, period)));
});

dashboardRouter.get("/expenses", authenticatedRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { period } = dashboardExpensesQuerySchema.parse(request.query);
  response.json(ok(await getDashboardExpenses(tenant.organizationId, tenant.timezone, period)));
});

dashboardRouter.get("/daily-closing.pdf", authenticatedRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { date } = dailyClosingPdfQuerySchema.parse(request.query);
  const pdf = await renderDailyClosingPdf(tenant.organizationId, tenant.timezone, date);
  response
    .status(200)
    .set({
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="cierre-caja-${date}.pdf"`,
      "Content-Length": String(pdf.length),
      "Content-Type": "application/pdf"
    })
    .send(pdf);
});

dashboardRouter.get("/analytics-report.pdf", authenticatedRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { from, to } = analyticsReportPdfQuerySchema.parse(request.query);
  const pdf = await renderAnalyticsReportPdf(tenant.organizationId, tenant.timezone, from, to);
  response
    .status(200)
    .set({
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="resumen-analitico-${from}-${to}.pdf"`,
      "Content-Length": String(pdf.length),
      "Content-Type": "application/pdf"
    })
    .send(pdf);
});

dashboardRouter.post("/expenses", authenticatedRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const input = createExpenseSchema.parse(request.body);
  const expense = await prisma.expense.create({
    data: {
      organizationId: tenant.organizationId,
      description: input.description,
      amountCents: input.amountCents,
      category: input.category,
      paymentMethod: input.paymentMethod,
      occurredOn: new Date(input.occurredOn)
    },
    select: { id: true, description: true, amountCents: true, category: true, paymentMethod: true, occurredOn: true }
  });
  await auditLog({
    organizationId: tenant.organizationId,
    userId: tenant.userId,
    action: "expense.create",
    entityType: "Expense",
    entityId: expense.id
  });
  response.status(201).json(ok(expense));
});

dashboardRouter.delete("/expenses/:expenseId", authenticatedRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { expenseId } = expenseParamsSchema.parse(request.params);
  const deleted = await prisma.expense.deleteMany({
    where: { id: expenseId, organizationId: tenant.organizationId }
  });
  if (!deleted.count) throw new AppError(404, "NOT_FOUND", "Expense not found");
  await auditLog({
    organizationId: tenant.organizationId,
    userId: tenant.userId,
    action: "expense.delete",
    entityType: "Expense",
    entityId: expenseId
  });
  response.json(ok({ deleted: true }));
});
