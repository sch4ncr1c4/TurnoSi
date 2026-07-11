import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { env } from "../config/env.js";
import { AppError } from "./app-error.js";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  organizationId: string | null;
  sid: string;
  jti: string;
  iss: "turnosi-api";
  aud: "turnosi-web";
  iat: number;
  exp: number;
};

type AuthTokenInput = {
  sub: string;
  email: string;
  organizationId: string | null;
  sessionId: string;
};

const payloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  organizationId: z.string().nullable(),
  sid: z.string().min(1),
  jti: z.string().uuid(),
  iss: z.literal("turnosi-api"),
  aud: z.literal("turnosi-web"),
  iat: z.number().int().positive(),
  exp: z.number().int().positive()
});

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url<T>(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function signValue(value: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
}

export function signAuthToken(input: AuthTokenInput) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: input.sub,
    email: input.email,
    organizationId: input.organizationId,
    sid: input.sessionId,
    jti: randomUUID(),
    iss: "turnosi-api",
    aud: "turnosi-web",
    iat: now,
    exp: now + env.AUTH_ACCESS_TTL_SECONDS
  };

  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = signValue(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    throw new AppError(401, "INVALID_TOKEN", "Invalid authentication token");
  }

  let parsedHeader: unknown;
  try {
    parsedHeader = fromBase64Url<unknown>(header);
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid authentication token");
  }

  if (
    typeof parsedHeader !== "object" ||
    parsedHeader === null ||
    (parsedHeader as Record<string, unknown>).alg !== "HS256" ||
    (parsedHeader as Record<string, unknown>).typ !== "JWT"
  ) {
    throw new AppError(401, "INVALID_TOKEN", "Invalid authentication token");
  }

  const expectedSignature = signValue(`${header}.${body}`);
  const providedSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    throw new AppError(401, "INVALID_TOKEN", "Invalid authentication token");
  }

  let payload: AuthTokenPayload;
  try {
    payload = payloadSchema.parse(fromBase64Url<unknown>(body));
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid authentication token");
  }
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    throw new AppError(401, "TOKEN_EXPIRED", "Authentication token expired");
  }

  return payload;
}
