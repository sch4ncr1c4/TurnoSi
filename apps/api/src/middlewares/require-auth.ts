import type { NextFunction, Request, Response } from "express";

import { AppError } from "../lib/app-error.js";
import { getAuthCookieName, parseCookies } from "../lib/cookies.js";
import { verifyAuthToken } from "../lib/token.js";
import { prisma } from "../database/prisma.js";

function getBearerToken(request: Request) {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const bearerToken = getBearerToken(request);
  const cookieToken = parseCookies(request.header("cookie"))[getAuthCookieName()];
  const token = bearerToken || cookieToken;

  if (!token) {
    next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
    return;
  }

  try {
    const auth = verifyAuthToken(token);
    const session = await prisma.authSession.findUnique({
      where: { id: auth.sid },
      select: { userId: true, revokedAt: true, expiresAt: true }
    });
    if (!session || session.userId !== auth.sub || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AppError(401, "INVALID_TOKEN", "Invalid authentication token");
    }
    request.auth = auth;
    next();
  } catch (error) {
    next(error);
  }
}
