import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { createSecret, hashToken, tokenMatches } from "../../lib/crypto.js";
import { parseCookies, getRefreshCookieName, setAuthCookie, setRefreshCookie } from "../../lib/cookies.js";
import { signAuthToken } from "../../lib/token.js";

function requestMetadata(request: Request) {
  return {
    userAgent: request.get("user-agent")?.slice(0, 500) ?? null,
    ipAddress: request.ip?.slice(0, 100) ?? null
  };
}

export async function createSession(
  request: Request,
  response: Response,
  user: { id: string; email: string },
  organizationId: string | null,
  familyId = randomUUID()
) {
  const secret = createSecret();
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      familyId,
      tokenHash: hashToken(secret),
      expiresAt: new Date(Date.now() + env.AUTH_REFRESH_TTL_SECONDS * 1000),
      ...requestMetadata(request)
    }
  });

  setAuthCookie(response, signAuthToken({
    sub: user.id,
    email: user.email,
    organizationId,
    sessionId: session.id
  }));
  setRefreshCookie(response, `${session.id}.${secret}`);
}

export function getRefreshToken(request: Request) {
  return parseCookies(request.get("cookie"))[getRefreshCookieName()] ?? null;
}

export async function rotateSession(request: Request, response: Response) {
  const token = getRefreshToken(request);
  const [sessionId, secret, extra] = token?.split(".") ?? [];
  if (!sessionId || !secret || extra) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }

  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          memberships: { orderBy: { createdAt: "asc" } }
        }
      }
    }
  });

  if (!session || !tokenMatches(secret, session.tokenHash)) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }

  if (session.revokedAt) {
    await prisma.authSession.updateMany({
      where: { familyId: session.familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    throw new AppError(401, "REFRESH_TOKEN_REUSED", "Session revoked");
  }

  if (session.expiresAt <= new Date()) {
    throw new AppError(401, "REFRESH_TOKEN_EXPIRED", "Session expired");
  }

  const newSecret = createSecret();
  const newSession = await prisma.$transaction(async (tx) => {
    const revoked = await tx.authSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    if (revoked.count !== 1) {
      throw new AppError(401, "REFRESH_TOKEN_REUSED", "Session revoked");
    }
    const created = await tx.authSession.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        tokenHash: hashToken(newSecret),
        expiresAt: new Date(Date.now() + env.AUTH_REFRESH_TTL_SECONDS * 1000),
        ...requestMetadata(request)
      }
    });
    await tx.authSession.update({
      where: { id: session.id },
      data: { replacedById: created.id }
    });
    return created;
  });

  const organizationId = session.user.memberships[0]?.organizationId ?? null;
  setAuthCookie(response, signAuthToken({
    sub: session.user.id,
    email: session.user.email,
    organizationId,
    sessionId: newSession.id
  }));
  setRefreshCookie(response, `${newSession.id}.${newSecret}`);
}

export async function revokeSession(request: Request) {
  const token = getRefreshToken(request);
  const [sessionId, secret] = token?.split(".") ?? [];
  if (!sessionId || !secret) return;

  const session = await prisma.authSession.findUnique({ where: { id: sessionId } });
  if (!session || !tokenMatches(secret, session.tokenHash)) return;

  await prisma.authSession.updateMany({
    where: { familyId: session.familyId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
