import type { NextFunction, Request, Response } from "express";

import { AppError } from "../lib/app-error.js";
import { getAuthCookieName, parseCookies } from "../lib/cookies.js";
import { verifyAuthToken } from "../lib/token.js";

function getBearerToken(request: Request) {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const bearerToken = getBearerToken(request);
  const cookieToken = parseCookies(request.header("cookie"))[getAuthCookieName()];
  const token = bearerToken || cookieToken;

  if (!token) {
    next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
    return;
  }

  request.auth = verifyAuthToken(token);
  next();
}
