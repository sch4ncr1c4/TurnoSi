import type { NextFunction, Request, Response } from "express";

import { requireActiveSubscription as assertActiveSubscription } from "../modules/billing/subscription-access.service.js";

export async function requireActiveSubscription(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  await assertActiveSubscription(request.tenant!.organizationId);
  next();
}
