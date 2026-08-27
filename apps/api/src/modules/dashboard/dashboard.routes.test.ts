import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../../middlewares/error-handler.js";

const { getDashboardSummaryMock, renderAnalyticsReportPdfMock } = vi.hoisted(() => ({
  getDashboardSummaryMock: vi.fn(),
  renderAnalyticsReportPdfMock: vi.fn()
}));

vi.mock("./dashboard.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./dashboard.service.js")>();
  return {
    ...original,
    getDashboardSummary: getDashboardSummaryMock,
    renderAnalyticsReportPdf: renderAnalyticsReportPdfMock
  };
});

import { dashboardRouter } from "./dashboard.routes.js";

describe("dashboard route isolation", () => {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.tenant = {
      organizationId: "organization-a",
      role: "owner",
      timezone: "America/Argentina/Buenos_Aires",
      userId: "user-a"
    };
    next();
  });
  app.use("/dashboard", dashboardRouter);
  app.use(errorHandler);

  beforeEach(() => {
    getDashboardSummaryMock.mockReset();
    getDashboardSummaryMock.mockResolvedValue({ metrics: {}, today: {}, chart: [], services: [], team: [] });
    renderAnalyticsReportPdfMock.mockReset();
    renderAnalyticsReportPdfMock.mockResolvedValue(Buffer.from("pdf"));
  });

  it("always obtains the organization from the authenticated tenant", async () => {
    await request(app).get("/dashboard/summary?period=30d").expect(200);
    expect(getDashboardSummaryMock).toHaveBeenCalledWith(
      "organization-a",
      "America/Argentina/Buenos_Aires",
      "30d"
    );
  });

  it("rejects a manipulated organization parameter", async () => {
    await request(app)
      .get("/dashboard/summary?period=30d&organizationId=organization-b")
      .expect(400);
    expect(getDashboardSummaryMock).not.toHaveBeenCalled();
  });

  it("generates range reports only for the authenticated tenant", async () => {
    await request(app)
      .get("/dashboard/analytics-report.pdf?from=2026-08-01&to=2026-08-31")
      .expect(200);
    expect(renderAnalyticsReportPdfMock).toHaveBeenCalledWith(
      "organization-a",
      "America/Argentina/Buenos_Aires",
      "2026-08-01",
      "2026-08-31"
    );
  });
});
